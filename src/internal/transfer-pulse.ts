import {
  bn,
  compress,
  createRpc,
  Rpc,
  transfer,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { PublicKey } from "@solana/web3.js";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  try {
    while (true) {
      const compressedTxId = await compress(
        connection,
        fromKeypair,
        bn(10),
        fromKeypair.publicKey,
        new PublicKey("smt3AFtReRGVcrP11D6bSLEaKdUmrGfaTNowMVccJeu")
      );
      console.log("Compressed TxId", compressedTxId);
      // Transfer 10 lamports to self
      const txId = await transfer(
        connection,
        fromKeypair,
        10,
        fromKeypair,
        fromKeypair.publicKey,
        new PublicKey("smt3AFtReRGVcrP11D6bSLEaKdUmrGfaTNowMVccJeu"),
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
