import { 
  bn, buildAndSignTx, createRpc, Rpc, LightSystemProgram,
} from "@lightprotocol/stateless.js";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token";
import { 
  ComputeBudgetProgram, Keypair, PublicKey, SystemProgram,
  TransactionInstruction
} from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "./constants";
import * as splToken from "@solana/spl-token";
import { TpsRegulator, MetricsLogger, sleep } from './load/utils';

const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);
const payer = PAYER_KEYPAIR;
const MAX_TPS = 20;
const tpsRegulator = new TpsRegulator(MAX_TPS);
const metricsLogger = new MetricsLogger('compress-decompress-metrics.log');
let totalTxsSent = 0;
let errorCounts: { [key: string]: number } = {};

async function getBlockhash(connection: Rpc): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}

async function createMint(): Promise<PublicKey> {
  const mint = await splToken.createMint(
    connection as any,
    payer,
    payer.publicKey,
    null,
    9
  );
  return mint;
}

async function compressTokens(mint: PublicKey, recipients: PublicKey[]) {
  const sourceAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection as any,
    payer,
    mint,
    payer.publicKey
  );

  const amount = bn(100);
  const compressIx = await CompressedTokenProgram.compress({
    payer: payer.publicKey,
    owner: payer.publicKey,
    source: sourceAccount.address,
    toAddress: recipients,
    amount: recipients.map(() => amount),
    mint,
  });

  return sendTransaction([compressIx]);
}

async function decompressTokens(mint: PublicKey, recipient: PublicKey) {
  const decompressIx = await CompressedTokenProgram.decompress({
    payer: payer.publicKey,
    owner: payer.publicKey,
    recipient,
    amount: bn(100),
    mint,
  });

  return sendTransaction([decompressIx]);
}

async function sendTransaction(instructions: TransactionInstruction[]) {
  const blockhash = await getBlockhash(connection);
  const tx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ...instructions],
    payer,
    blockhash,
    []
  );
  return connection.sendTransaction(tx);
}

async function runCompressDecompressLoadTest() {
  console.log("Starting compress-decompress load test...");
  const mint = await createMint();
  const recipients = Array(1).fill(null).map(() =>new PublicKey("7FAR1Vgcwg7BX6XfUdWBdhMak6GnC2gokcZfrx2K4Qjx"));

  tpsRegulator.start();

  while (true) {
    await tpsRegulator.waitForToken();
    
    try {
      // Compress tokens to 15 recipients
      await compressTokens(mint, recipients);
      totalTxsSent++;

      // Decompress tokens for each recipient
      // for (const recipient of recipients) {
      //   await decompressTokens(mint, recipient);
      //   totalTxsSent++;
      // }

      // console.log(`Transactions sent: ${totalTxsSent}`);
      // metricsLogger.log(`Tx: ${totalTxsSent}, Errors: ${JSON.stringify(errorCounts)}`);

    } catch (error) {
      console.error("Error in transaction:", error);
      const errorCode = (error as any).code || 'unknown';
      errorCounts[errorCode] = (errorCounts[errorCode] || 0) + 1;
    }

    throw new Error("stop");
    if (totalTxsSent % 100 === 0) {
      await sleep(30000);
    }
  }
}

runCompressDecompressLoadTest().catch(error => {
  console.error("Fatal error in runCompressDecompressLoadTest:", error);
  tpsRegulator.stop();
});