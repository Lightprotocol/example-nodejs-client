import * as web3 from "@solana/web3.js";
import { RPC_ENDPOINT, PAYER_KEYPAIR, MINT_ADDRESS } from "../constants";
import {
  CompressedTokenProgram,
  selectMinCompressedTokenAccountsForTransfer,
} from "@lightprotocol/compressed-token";
import {
  bn,
  buildAndSignTx,
  createRpc,
  Rpc,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

async function compressAndDecompressTx(
  rpc: Rpc,
  payer: web3.Keypair,
  mintAddress: web3.PublicKey
): Promise<string | null> {
  const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    rpc,
    payer,
    mintAddress,
    payer.publicKey
  );

  const airDropAddresses = Array(8).fill(payer.publicKey);
  const amount = bn(100);

  const { blockhash } = await rpc.getLatestBlockhash();
  const instructions: web3.TransactionInstruction[] = [];
  instructions.push(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));

  const maxRecipientsPerInstruction = 5;
  const maxIxs = 3;
  let i = 0;
  let ixCount = 0;
  while (i < 1) {
    const recipientBatch = airDropAddresses.slice(i, i + maxRecipientsPerInstruction);
    const compressIx = await CompressedTokenProgram.compress({
      payer: payer.publicKey,
      owner: payer.publicKey,
      source: sourceTokenAccount.address,
      toAddress: new web3.PublicKey("7FAR1Vgcwg7BX6XfUdWBdhMak6GnC2gokcZfrx2K4Qjx"),
      amount: amount,
      mint: mintAddress,
    });
    instructions.push(compressIx);
    i = 1;
    ixCount++;
  }

  // const lookupTableAddress = new web3.PublicKey("qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V");
  // const lookupTableAccount = (await rpc.getAddressLookupTable(lookupTableAddress)).value!;

  // const tx = buildAndSignTx(instructions, payer, blockhash, [], [lookupTableAccount]);
  const tx = buildAndSignTx(instructions, payer, blockhash, []);
  const txId = await sendAndConfirmTx(rpc, tx, {skipPreflight: true});
  console.log(`Compress transaction sent: ${txId}`);

  // const cTas = await rpc.getCompressedTokenAccountsByOwner(payer.publicKey, { mint: mintAddress });
  // const [minCta] = selectMinCompressedTokenAccountsForTransfer(cTas.items, bn(3));
  // const validityProof = await rpc.getValidityProofDirect(minCta.map(cta => bn(cta.compressedAccount.hash)), []);
  
  // const decompressIx = await CompressedTokenProgram.decompress({
  //   payer: payer.publicKey,
  //   inputCompressedTokenAccounts: minCta,
  //   toAddress: sourceTokenAccount.address,
  //   amount: bn(3),
  //   recentInputStateRootIndices: validityProof.rootIndices,
  //   recentValidityProof: validityProof.compressedProof,
  // });
  
  // const txSize = decompressIx.data.length + 64; // 64 bytes for signature
  // console.log(`Decompress transaction size: ${txSize} bytes`);

  // const { blockhash: decompressBlockhash } = await rpc.getLatestBlockhash();
  // const decompressTx = buildAndSignTx([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), decompressIx], payer, decompressBlockhash, []);
  // const decompressTxId = await sendAndConfirmTx(rpc, decompressTx, {skipPreflight: false});
  // console.log(`Decompress transaction sent: ${decompressTxId}`);
  return txId;
}

async function runCompressAndDecompressPulse() {
  await compressAndDecompressTx(connection, fromKeypair, MINT_ADDRESS);
  while (true) {
    try {
      
    } catch (error) {
      console.error("Error in transaction:", error);
    }
  }
}

runCompressAndDecompressPulse().catch(error => {
  console.error("Fatal error in runCompressAndDecompressPulse:", error);
});
