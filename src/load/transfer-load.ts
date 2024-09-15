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

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

async function compressedTransferToSelf(
  rpc: Rpc,
  payer: web3.Keypair,
  mintAddress: web3.PublicKey
): Promise<string | null> {
  const amount = bn(5);

  const cTas = await rpc.getCompressedTokenAccountsByOwner(payer.publicKey, { mint: mintAddress });
  const [minCta] = selectMinCompressedTokenAccountsForTransfer(cTas.items, amount);
  console.log("INPUTS LEN: ", minCta.length);
  if (minCta.length >3 ) {
    console.log("TOO MANY INPUTS");
    return null;
  }
  const validityProof = await rpc.getValidityProofDirect(minCta.map(cta => bn(cta.compressedAccount.hash)), []);

  const randomRecipient = web3.Keypair.generate().publicKey;
  const transferIx = await CompressedTokenProgram.transfer({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: minCta,
    toAddress: randomRecipient,
    amount,
    recentInputStateRootIndices: validityProof.rootIndices,
    recentValidityProof: validityProof.compressedProof,
  });

  const { blockhash } = await rpc.getLatestBlockhash();
  const tx = buildAndSignTx([
    web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
    transferIx
  ], payer, blockhash, []);
  
  const txId = await sendAndConfirmTx(rpc, tx, {skipPreflight: false});
  console.log(`Compressed transfer transaction sent: ${txId}`);
  return txId;
}

async function runCompressedTransferPulse() {
  while (true) {
    try {
      await compressedTransferToSelf(connection, fromKeypair, MINT_ADDRESS);
    } catch (error) {
      console.error("Error in transaction:", error);
    }
  }
}

runCompressedTransferPulse().catch(error => {
  console.error("Fatal error in runCompressedTransferPulse:", error);
});