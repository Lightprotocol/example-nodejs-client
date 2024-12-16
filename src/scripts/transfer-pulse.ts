import { createRpc, Rpc, transfer } from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  try {
    while (true) {
      // Transfer 10 lamports to self
      const txId = await transfer(
        connection,
        fromKeypair,
        10,
        fromKeypair,
        fromKeypair.publicKey,
        undefined,
        {
          skipPreflight: false,
        }
      );
      console.log(
        `Compressed SOL Transfer Success. Transaction Signature:`,
        txId
      );

      // Wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
