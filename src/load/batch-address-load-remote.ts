import { 
  bn,
  buildAndSignTx,
  CompressedProof,
  createRpc,
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
} from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram, ConfirmOptions, Signer, SystemProgram, TransactionInstruction, TransactionSignature } from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";
import fs from 'fs';

console.log("Starting script...");

const fromKeypair = PAYER_KEYPAIR;
const connection : Rpc= createRpc(RPC_ENDPOINT, RPC_ENDPOINT);
let lastBlockhash: string | null = null;
let lastBlockhashTime: number = 0;
let totalTxsSent = 0;
let errorCounts: { [key: string]: number } = {};

const MAX_TPS = 5
let availableTokens = MAX_TPS;
const tokenRefillInterval = 1000; // 1 second

async function getBlockhash(): Promise<string> {
  const now = Date.now();
  if (!lastBlockhash || now - lastBlockhashTime > 30000) {
    const { blockhash } = await connection.getLatestBlockhash();
    lastBlockhash = blockhash;
    lastBlockhashTime = now;
  }
  return lastBlockhash;
}

function logMetrics(message: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('metrics-remote.log', `${timestamp} - ${message}\n`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function refillTokens() {
  setInterval(() => {
    availableTokens = Math.min(availableTokens + MAX_TPS, MAX_TPS);
  }, tokenRefillInterval);
}
async function runCreateAccountPulse() {
  console.log("Starting runCreateAccountPulse...");
  const startTime = Date.now();
  let txCount = 0;

  refillTokens();

  while (true) {
    const availableTxs = Math.min(availableTokens, MAX_TPS);
    if (availableTxs > 0) {
      availableTokens -= availableTxs;
      
      const txPromises = Array(availableTxs).fill(null).map(() => 
        createAccount(connection, fromKeypair, LightSystemProgram.programId)
      );

      Promise.all(txPromises)
        .then(txIds => {
          txIds.forEach(txId => {
            if (txId !== null) {
              totalTxsSent++;
              txCount++;
              console.log(`Transaction sent: ${txId}`);
            }
          });
          
          const elapsedTime = (Date.now() - startTime) / 1000;
          const txRate = totalTxsSent / elapsedTime;
          
          logMetrics(`Tx: ${totalTxsSent}, Rate: ${txRate.toFixed(2)} tx/s, Errors: ${JSON.stringify(errorCounts)}`);
          
          if (txCount % 150 === 0) {
            return sleep(60000);
          } else if (txCount % 100 === 0) {
            return sleep(30000);
          }
        })
        .catch(error => {
          console.error("Error in createAccount:", error);
          const errorCode = error.code || 'unknown';
          errorCounts[errorCode] = (errorCounts[errorCode] || 0) + 1;
        });
    } else {
      await sleep(100); // Wait a bit if no tokens are available
    }
  }
}

console.log("About to run createAccountPulse...");
runCreateAccountPulse().catch(error => {
  console.error("Fatal error in runCreateAccountPulse:", error);
});

// Adapted from @lightprotocol/stateless.js
export async function createAccount(
  rpc: Rpc,
  payer: Signer,
  programId: PublicKey,
  addressTree?: PublicKey,
  addressQueue?: PublicKey,
  outputStateTree?: PublicKey,
  confirmOptions?: ConfirmOptions,
): Promise<TransactionSignature> {
  const blockhash = await getBlockhash();

  addressTree = addressTree ?? defaultTestStateTreeAccounts().addressTree;
  outputStateTree = outputStateTree ?? defaultTestStateTreeAccounts().merkleTree;
  addressQueue = addressQueue ?? defaultTestStateTreeAccounts().addressQueue;
  const instructions = [];

  // Create 1 account in the first instruction
  const seed1 = randomBytes(32);
  const address1 = await deriveAddress(seed1, addressTree);
  // console.time(`getValidityProofDirect ${address1.toBase58()}`);
  // const proof1 = await rpc.getValidityProofDirect(undefined, [bn(address1.toBytes())]);
  // console.timeEnd(`getValidityProofDirect ${address1.toBase58()}`);
  // const params1: NewAddressParams = {
  //   seed: seed1,
  //   addressMerkleTreeRootIndex: proof1.rootIndices[0],
  //   addressMerkleTreePubkey: proof1.merkleTrees[0],
  //   addressQueuePubkey: proof1.nullifierQueues[0],
  // };
  // const ix1 = await createAccounts({
  //   payer: payer.publicKey,
  //   newAddressParamsMultiple: [params1],
  //   newAddresses: [Array.from(address1.toBytes())],
  //   recentValidityProof: proof1.compressedProof,
  //   outputStateTree,
  // });
  // instructions.push(ix1);

  // Create 2 accounts in the second instruction
  const seed2 = randomBytes(32);
  const seed3 = randomBytes(32);
  const address2 = await deriveAddress(seed2, addressTree);
  const address3 = await deriveAddress(seed3, addressTree);
  const proof2 = await rpc.getValidityProof(undefined, [bn(address2.toBytes()), bn(address3.toBytes())]);
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

  const txId = await rpc.sendTransaction(tx);
  console.log(`Transaction sent: ${txId}`);
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
