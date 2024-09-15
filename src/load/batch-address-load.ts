import { 
  bn,
  buildAndSignTx,
  CompressedProof,
  defaultStaticAccountsStruct,
  defaultTestStateTreeAccounts,
  deriveAddress,
  InstructionDataInvoke,
  LightSystemProgram,
  NewAddressParams,
  packCompressedAccounts,
  packNewAddressParams,
  Rpc,
  toAccountMetas,
  createRpc,
} from "@lightprotocol/stateless.js";
import { ConfirmOptions, Signer, SystemProgram, TransactionInstruction, TransactionSignature, ComputeBudgetProgram, BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";
import fs from 'fs';

export class TokenDispenser {
  private tokens: number;
  private lastRefillTime: number;

  constructor(private refillRate: number) {
    this.tokens = refillRate;
    this.lastRefillTime = Date.now();
  }

  async acquireToken(): Promise<void> {
    while (true) {
      this.refillTokens();
      if (this.tokens > 0) {
        this.tokens--;
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedTime = (now - this.lastRefillTime) / 1000;
    const newTokens = Math.floor(elapsedTime * this.refillRate);
    
    if (newTokens > 0) {
      this.tokens = Math.min(this.tokens + newTokens, this.refillRate);
      this.lastRefillTime = now;
    }
  }
}

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT!, RPC_ENDPOINT!);

let cachedBlockhash: BlockhashWithExpiryBlockHeight | null = null;
let lastBlockhashFetch: number = 0;

async function getBlockhash(rpc: Rpc): Promise<string> {
  const now = Date.now();
  if (cachedBlockhash && now - lastBlockhashFetch < 30000) {
    return cachedBlockhash.blockhash;
  }

  const { blockhash, lastValidBlockHeight } = await rpc.getLatestBlockhash();
  cachedBlockhash = { blockhash, lastValidBlockHeight };
  lastBlockhashFetch = now;
  return blockhash;
}

class SimpleMetricsLogger {
  constructor(private logFile: string) {}

  log(message: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `${timestamp} - ${message}\n`);
  }
}

const metricsLogger = new SimpleMetricsLogger('batch-address-load-metrics.log');

const TOKEN_DISPENSER_RATE = 100;
const tokenDispenser = new TokenDispenser(TOKEN_DISPENSER_RATE);

async function runCreateAccountPulse() {
  console.log("Starting create account pulse...");
  let totalTxsSent = 0;
  let errorCounts: { [key: string]: number } = {};
  let startTime = Date.now();

  while (true) {
    try {
      const accountCreations = Array(TOKEN_DISPENSER_RATE).fill(null).map(async () => {
        await tokenDispenser.acquireToken();
        try {
          await createAccount(connection, fromKeypair, LightSystemProgram.programId);
          totalTxsSent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errorCounts[errorMessage] = (errorCounts[errorMessage] || 0) + 1;
        }
      });
      await Promise.all(accountCreations);
      
      const elapsedTime = (Date.now() - startTime) / 1000;
      const tps = totalTxsSent / elapsedTime;
      
      metricsLogger.log(`Tx: ${totalTxsSent}, Rate: ${tps.toFixed(2)} tx/s, Errors: ${JSON.stringify(errorCounts)}`);
    } catch (error) {
      console.error("Error in main loop:", error);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

runCreateAccountPulse().catch(error => {
  console.error("Fatal error in runCreateAccountPulse:", error);
});

async function createAccount(
  rpc: Rpc,
  payer: Signer,
  programId: PublicKey,
  addressTree?: PublicKey,
  addressQueue?: PublicKey,
  outputStateTree?: PublicKey,
  confirmOptions?: ConfirmOptions,
): Promise<TransactionSignature> {
  const blockhash = await getBlockhash(rpc);

  addressTree = addressTree ?? defaultTestStateTreeAccounts().addressTree;
  outputStateTree = outputStateTree ?? defaultTestStateTreeAccounts().merkleTree;
  addressQueue = addressQueue ?? defaultTestStateTreeAccounts().addressQueue;
  const instructions = [];

  const seed1 = randomBytes(32);
  const address1 = await deriveAddress(seed1, addressTree);
  const proof1 = await rpc.getValidityProofDirect(undefined, [bn(address1.toBytes())]);
  const params1: NewAddressParams = {
    seed: seed1,
    addressMerkleTreeRootIndex: proof1.rootIndices[0],
    addressMerkleTreePubkey: proof1.merkleTrees[0],
    addressQueuePubkey: proof1.nullifierQueues[0],
  };
  const ix1 = await createAccounts({
    payer: payer.publicKey,
    newAddressParamsMultiple: [params1],
    newAddresses: [Array.from(address1.toBytes())],
    recentValidityProof: proof1.compressedProof,
    outputStateTree,
  });
  instructions.push(ix1);

  const seed2 = randomBytes(32);
  const seed3 = randomBytes(32);
  const address2 = await deriveAddress(seed2, addressTree);
  const address3 = await deriveAddress(seed3, addressTree);
  const proof2 = await rpc.getValidityProofDirect(undefined, [bn(address2.toBytes()), bn(address3.toBytes())]);
  const params2: NewAddressParams = {
    seed: seed2,
    addressMerkleTreeRootIndex: proof2.rootIndices[0],
    addressMerkleTreePubkey: proof2.merkleTrees[0],
    addressQueuePubkey: proof2.nullifierQueues[0],
  };
  const params3: NewAddressParams = {
    seed: seed3,
    addressMerkleTreeRootIndex: proof2.rootIndices[1],
    addressMerkleTreePubkey: proof2.merkleTrees[1],
    addressQueuePubkey: proof2.nullifierQueues[1],
  };
  const ix2 = await createAccounts({
    payer: payer.publicKey,
    newAddressParamsMultiple: [params2, params3],
    newAddresses: [Array.from(address2.toBytes()), Array.from(address3.toBytes())],
    recentValidityProof: proof2.compressedProof,
    outputStateTree,
  });
  instructions.push(ix2);

  const tx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), ...instructions],
    payer,
    blockhash,
    [],
  );

  console.log("Sending transaction...");
  const txId = await connection.sendTransaction(tx);
  console.log("Transaction sent:", txId);
  return txId;
}

async function createAccounts({
  payer,
  newAddressParamsMultiple,
  newAddresses,
  recentValidityProof,
  outputStateTree,
}: {
  payer: PublicKey;
  newAddressParamsMultiple: NewAddressParams[];
  newAddresses: number[][];
  recentValidityProof: CompressedProof;
  outputStateTree: PublicKey;
}): Promise<TransactionInstruction> {
  const outputCompressedAccounts = newAddresses.map(address => 
    LightSystemProgram.createNewAddressOutputState(address, payer, 0, [])
  ).flat();

  const {
    packedInputCompressedAccounts,
    packedOutputCompressedAccounts,
    remainingAccounts: _remainingAccounts,
  } = packCompressedAccounts(
    [],
    [],
    outputCompressedAccounts,
    outputStateTree,
  );

  const { newAddressParamsPacked, remainingAccounts } =
    packNewAddressParams(newAddressParamsMultiple, _remainingAccounts);

  const rawData: InstructionDataInvoke = {
    proof: recentValidityProof,
    inputCompressedAccountsWithMerkleContext: packedInputCompressedAccounts,
    outputCompressedAccounts: packedOutputCompressedAccounts,
    relayFee: null,
    newAddressParams: newAddressParamsPacked,
    compressOrDecompressLamports: null,
    isCompress: false,
  };

  const ixData = LightSystemProgram.program.coder.types.encode(
    'InstructionDataInvoke',
    rawData,
  );

  const instruction = await LightSystemProgram.program.methods
    .invoke(ixData)
    .accounts({
      ...defaultStaticAccountsStruct(),
      feePayer: payer,
      authority: payer,
      solPoolPda: null,
      decompressionRecipient: null,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(toAccountMetas(remainingAccounts))
    .instruction();

  return instruction;
}