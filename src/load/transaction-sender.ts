import { Rpc, createRpc } from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TpsRegulator, MetricsLogger, sleep } from './utils';

export class TransactionSender {
  private connection: Rpc;
  private lastBlockhash: string | null = null;
  private lastBlockhashTime: number = 0;
  private totalTxsSent = 0;
  private errorCounts: { [key: string]: number } = {};
  private tpsRegulator: TpsRegulator;
  private metricsLogger: MetricsLogger;

  constructor(rpcEndpoint: string, maxTps: number) {
    this.connection = createRpc(rpcEndpoint, rpcEndpoint);
    this.tpsRegulator = new TpsRegulator(maxTps);
    this.metricsLogger = new MetricsLogger('metrics.log');
  }

  async getBlockhash(): Promise<string> {
    const now = Date.now();
    if (!this.lastBlockhash || now - this.lastBlockhashTime > 30000) {
      console.log("Fetching new blockhash");
      const { blockhash } = await this.connection.getLatestBlockhash();
      this.lastBlockhash = blockhash;
      this.lastBlockhashTime = now;
    } else {
      console.log("Reusing existing blockhash");
    }
    console.log(`Using blockhash: ${this.lastBlockhash}, age: ${(now - this.lastBlockhashTime) / 1000}s`);
    return this.lastBlockhash!;
  }

  async runTransactionPulse(transactionFunction: () => Promise<string | null>) {
    console.log("Starting transaction pulse...");
    const startTime = Date.now();
    let txCount = 0;

    this.tpsRegulator.start();

    while (true) {
      await this.tpsRegulator.waitForToken();
      
      transactionFunction()
        .then(txId => {
          if (txId !== null) {
            this.totalTxsSent++;
            txCount++;
            console.log(`Transaction sent: ${txId}`);
          }
          
          const elapsedTime = (Date.now() - startTime) / 1000;
          const txRate = this.totalTxsSent / elapsedTime;
          
          if (txCount % 100 === 0) {
            this.metricsLogger.log(`Tx: ${this.totalTxsSent}, Rate: ${txRate.toFixed(2)} tx/s, Errors: ${JSON.stringify(this.errorCounts)}`);
          }
          
          if (txCount % 150 === 0) {
            return sleep(60000);
          } else if (txCount % 100 === 0) {
            return sleep(30000);
          }
        })
        .catch(error => {
          console.error("Error in transaction:", error);
          const errorCode = error.code || 'unknown';
          this.errorCounts[errorCode] = (this.errorCounts[errorCode] || 0) + 1;
        });
    }
  }

  getConnection(): Rpc {
    return this.connection;
  }

  static createComputeBudgetInstruction(units: number): TransactionInstruction {
    return ComputeBudgetProgram.setComputeUnitLimit({ units });
  }

  static async getLookupTableAccount(connection: Rpc, address: string): Promise<any> {
    const lookupTableAddress = new PublicKey(address);
    return (await connection.getAddressLookupTable(lookupTableAddress)).value!;
  }
}
