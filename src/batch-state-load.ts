import * as web3 from "@solana/web3.js";
import { RPC_ENDPOINT, PAYER_KEYPAIR, MINT_ADDRESS } from "./constants";
import {
  CompressedTokenProgram,
  selectMinCompressedTokenAccountsForTransfer,
} from "@lightprotocol/compressed-token";

import {
  bn,
  BN254,
  buildAndSignTx,
  createRpc,
  dedupeSigner,
  Rpc,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";
import { TransactionSender } from './load/transaction-sender';

(async () => {
  const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);
  const mintAddress = MINT_ADDRESS;
  const payer = PAYER_KEYPAIR;
  const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintAddress,
    payer.publicKey
  );
  const airDropAddresses = Array(15).fill(payer.publicKey);
  const amount = bn(1);
  const transactionSender = new TransactionSender(RPC_ENDPOINT!, 20);

  while (true) {
    try {
      await compressTx(
        connection,
        payer,
        sourceTokenAccount,
        airDropAddresses,
        amount,
        mintAddress
      );

      console.log("Compressed successfully");

      console.log("Decompressing");
      await decompressTx(
        connection,
        payer,
        airDropAddresses[0],
        bn(8),
        mintAddress
      );

      console.log("Decompressed successfully");
    } catch (error) {
      console.error("An error occurred:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
})();

async function compressTx(
  connection: Rpc,
  payer: web3.Keypair,
  source: splToken.Account,
  recipients: web3.PublicKey[],
  amount: BN254,
  mintAddress: web3.PublicKey
) {
  const maxRecipientsPerInstruction = 5;
  const maxIxs = 3; // empirically determined
  const instructions: web3.TransactionInstruction[] = [];

  instructions.push(
    TransactionSender.createComputeBudgetInstruction(500_000)
  );

  let i = 0;
  let ixCount = 0;
  while (i < recipients.length && ixCount < maxIxs) {
    const recipientBatch = recipients.slice(i, i + maxRecipientsPerInstruction);
    const compressIx = await CompressedTokenProgram.compress({
      payer: payer.publicKey,
      owner: payer.publicKey,
      source: source.address,
      toAddress: recipientBatch,
      amount: recipientBatch.map(() => amount),
      mint: mintAddress,
    });
    instructions.push(compressIx);
    i += maxRecipientsPerInstruction;
    ixCount++;
  }

  const lookupTableAccount = await TransactionSender.getLookupTableAccount(
    connection,
    "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V"
  );

  // Sign the transaction with the payer and mint keypair
  const additionalSigners = dedupeSigner(payer, []);

  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  const tx = buildAndSignTx(instructions, payer, blockhash, additionalSigners, [
    lookupTableAccount,
  ]);

  // send the transaction
  const txSignature = await sendAndConfirmTx(connection, tx);
  console.log(`Compress Tx sent: ${txSignature}`);
}

async function decompressTx(
  connection: Rpc,
  payer: web3.Keypair,
  recipient: web3.PublicKey,
  amount: BN254,
  mintAddress: web3.PublicKey
) {
  const instructions: web3.TransactionInstruction[] = [];

  instructions.push(
    TransactionSender.createComputeBudgetInstruction(500_000)
  );

  const cTas = await connection.getCompressedTokenAccountsByOwner(
    payer.publicKey,
    {
      mint: mintAddress,
    }
  );
  const [minCta] = selectMinCompressedTokenAccountsForTransfer(
    cTas.items,
    amount
  );
  console.log(`minCta: ${minCta}`);
  const validityProof = await connection.getValidityProofDirect(
    minCta.map((cta) => bn(cta.compressedAccount.hash)),
    []
  );
  const decompressIx = await CompressedTokenProgram.decompress({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: minCta,
    toAddress: recipient,
    amount: amount,
    recentInputStateRootIndices: validityProof.rootIndices,
    recentValidityProof: validityProof.compressedProof,
  });
  instructions.push(decompressIx);

  const lookupTableAccount = await TransactionSender.getLookupTableAccount(
    connection,
    "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V"
  );

  // Sign the transaction with the payer and mint keypair
  const additionalSigners = dedupeSigner(payer, []);

  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  const tx = buildAndSignTx(instructions, payer, blockhash, additionalSigners, [
    lookupTableAccount,
  ]);

  // send the transaction
  const txSignature = await connection.sendTransaction(tx, {
    skipPreflight: true,
  });
  console.log(`Decompress Tx sent: ${txSignature}`);
}
