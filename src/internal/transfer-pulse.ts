import {
  bn,
  compress,
  createRpc,
  pickRandomTreeAndQueue,
  Rpc,
  sleep,
  transfer,
} from "@lightprotocol/stateless.js";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";

// The "main" keypair that initially funds everyone.
const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

// Number of new keypairs to create & fund:
const batchSize = 50;
// How much SOL each new keypair gets initially (one-time fund):
const INITIAL_SOL_PER_KEYPAIR = 0.1;
// Minimum SOL to maintain in each keypair before compressing again:
const MIN_SOL_PER_KEYPAIR = 0.02;

// The lamports needed to compress each iteration (e.g. ~0.0001 SOL).
const COMPRESS_LAMPORTS = bn(1e5);
// The compressed SOL to transfer each iteration (1 "light unit").
const COMPRESSED_TRANSFER_AMOUNT = 1;

(async () => {
  try {
    // ------------------------------------------------------------------
    // 1) Create & Fund N = batchSize New Keypairs
    // ------------------------------------------------------------------
    const newKeypairs: Keypair[] = [];
    for (let i = 0; i < batchSize; i++) {
      newKeypairs.push(Keypair.generate());
    }

    console.log(`Created ${batchSize} new keypairs.\nFunding each with ${INITIAL_SOL_PER_KEYPAIR} SOL...`);

    for (let i = 0; i < batchSize; i++) {
      const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: newKeypairs[i].publicKey,
            lamports: Math.floor(INITIAL_SOL_PER_KEYPAIR * LAMPORTS_PER_SOL),
          })
      );
      const txSignature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [fromKeypair]
      );
      console.log(
          `Funded newKeypair[${i}] (${newKeypairs[i].publicKey.toBase58()}) ` +
          `with ~${INITIAL_SOL_PER_KEYPAIR} SOL. Tx: ${txSignature}`
      );
    }

    console.log("\nAll new keypairs funded. Entering main loop...\n");

    // ------------------------------------------------------------------
    // 2) Infinite Loop
    // ------------------------------------------------------------------
    while (true) {
      // a) Fetch the latest active state trees and pick one randomly
      const activeStateTrees = await connection.getCachedActiveStateTreeInfo();
      const { tree } = pickRandomTreeAndQueue(activeStateTrees);
      console.log("Picked random output state tree:", tree.toBase58());

      // b) For each new keypair: ensure minimum SOL, then compress, then transfer
      const compressAndTransferPromises = newKeypairs.map(async (senderKp, i) => {
        // ----------------------------------------------------------------------
        // i) Ensure this keypair has enough on-chain SOL
        // ----------------------------------------------------------------------
        const balance = await connection.getBalance(senderKp.publicKey);
        const thresholdLamports = MIN_SOL_PER_KEYPAIR * LAMPORTS_PER_SOL;

        if (balance < thresholdLamports) {
          // Top up from fromKeypair
          const topUpLamports = thresholdLamports - balance;
          const topUpTx = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: senderKp.publicKey,
                lamports: topUpLamports,
              })
          );
          const topUpSig = await sendAndConfirmTransaction(
              connection,
              topUpTx,
              [fromKeypair]
          );
          console.log(
              `Keypair[${i}] was below ${MIN_SOL_PER_KEYPAIR} SOL. ` +
              `Topped up ~${topUpLamports / LAMPORTS_PER_SOL} SOL. Tx: ${topUpSig}`
          );
        }

        // ----------------------------------------------------------------------
        // ii) Compress some on-chain SOL -> compressed domain
        // ----------------------------------------------------------------------
        const compressTxId = await compress(
            connection,
            senderKp,            // authority = "senderKp"
            COMPRESS_LAMPORTS,   // lamports to compress (0.0001 SOL)
            senderKp.publicKey,  // compressed "recipient" = the same key
            tree
        );
        console.log(
            `Keypair[${i}] compressed ~${COMPRESS_LAMPORTS.toString()} lamports. Tx: ${compressTxId}`
        );

        // ----------------------------------------------------------------------
        // iii) Transfer from this keypair to the "next" one in compressed domain
        // ----------------------------------------------------------------------
        const recipientIndex = (i + 1) % batchSize;
        const recipientPubkey = newKeypairs[recipientIndex].publicKey;
        const transferTxId = await transfer(
            connection,
            senderKp,            // fee payer & authority
            COMPRESSED_TRANSFER_AMOUNT,
            senderKp,            // token authority (sender)
            recipientPubkey,     // recipient
            tree,
            {
              skipPreflight: false,
            }
        );
        console.log(
            `Compressed SOL Transfer: Keypair[${i}] --> Keypair[${recipientIndex}] ` +
            `Success. Tx: ${transferTxId}`
        );
      });

      // Wait for all compress+transfer calls in this iteration to finish
      await Promise.all(compressAndTransferPromises);

      // Sleep 2 seconds before the next iteration
      // await sleep(2000);
      console.log("\n--- Iteration complete. Starting next iteration... ---\n");
    }

  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
