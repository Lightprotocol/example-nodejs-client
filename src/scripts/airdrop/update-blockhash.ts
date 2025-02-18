import { Rpc } from "@lightprotocol/stateless.js";

export let currentBlockhash: string;

export async function updateBlockhash(
  connection: Rpc,
  signal: AbortSignal
): Promise<void> {
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    currentBlockhash = blockhash;
    console.log(`Initial blockhash: ${currentBlockhash}`);
  } catch (error) {
    console.error("Failed to fetch initial blockhash:", error);
    return;
  }

  // Start background update without awaiting
  (function updateInBackground() {
    if (signal.aborted) return;
    const timeoutId = setTimeout(async () => {
      if (signal.aborted) return; // Check if aborted before proceeding
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        currentBlockhash = blockhash;
        console.log(`Updated blockhash: ${currentBlockhash}`);
      } catch (error) {
        console.error("Failed to update blockhash:", error);
      }
      updateInBackground();
    }, 30_000);

    // Listen for the abort event to clear the timeout
    signal.addEventListener("abort", () => clearTimeout(timeoutId));
  })();
}
