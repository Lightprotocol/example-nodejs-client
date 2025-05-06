import { Rpc, sendAndConfirmTx } from "@lightprotocol/stateless.js";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { InstructionBatch } from "./create-instructions";
import { currentBlockhash, updateBlockhash } from "./update-blockhash";
import bs58 from "bs58";

export enum BatchResultType {
  Success = "success",
  Error = "error",
}

export type BatchResult =
  | { type: BatchResultType.Success; index: number; signature: string }
  | { type: BatchResultType.Error; index: number; error: string };

export async function* signAndSendAirdropBatches(
  batches: InstructionBatch[],
  payer: Keypair,
  connection: Rpc,
  maxRetries = 3
): AsyncGenerator<BatchResult> {
  const abortController = new AbortController();
  const { signal } = abortController;

  await updateBlockhash(connection, signal);

  const statusMap = new Array(batches.length).fill(0); // Initialize all as pending (0)

  // Use zk-compression LUT for your network
  // https://www.zkcompression.com/developers/protocol-addresses-and-urls#lookup-tables
  const lookupTableAddress = new PublicKey(
    "9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ"
  );

  // Get the lookup table account
  const lookupTableAccount = (
    await connection.getAddressLookupTable(lookupTableAddress)
  ).value!;

  while (statusMap.includes(0)) {
    // Continue until all are confirmed or errored
    const pendingBatches = statusMap.filter((status) => status === 0).length;
    console.log(`Sending ${pendingBatches} transactions`);

    const sends = statusMap.map(async (status, index) => {
      if (status !== 0) return; // Skip non-pending batches

      let retries = 0;
      while (retries < maxRetries && statusMap[index] === 0) {
        if (!currentBlockhash) {
          console.warn("Waiting for blockhash to be set...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        try {
          const tx = new VersionedTransaction(
            new TransactionMessage({
              payerKey: payer.publicKey,
              recentBlockhash: currentBlockhash,
              instructions: batches[index],
            }).compileToV0Message([lookupTableAccount])
          );
          tx.sign([payer]);

          const sig = bs58.encode(tx.signatures[0]);
          console.log(`Batch ${index} signature: ${sig}`);

          const confirmedSig = await sendAndConfirmTx(connection, tx, {
            skipPreflight: true,
            commitment: "confirmed",
          });

          if (confirmedSig) {
            statusMap[index] = 1; // Mark as confirmed
            return {
              type: BatchResultType.Success,
              index,
              signature: confirmedSig,
            };
          }
        } catch (e) {
          retries++;
          console.warn(`Retrying batch ${index}, attempt ${retries + 1}`);
          if (retries >= maxRetries) {
            statusMap[index] = `err: ${(e as Error).message}`; // Mark as error
            return {
              type: BatchResultType.Error,
              index,
              error: (e as Error).message,
            };
          }
        }
      }
    });

    const results = await Promise.all(sends);
    for (const result of results) {
      if (result) yield result as BatchResult;
    }
  }

  // Stop the blockhash update loop
  abortController.abort();
}
