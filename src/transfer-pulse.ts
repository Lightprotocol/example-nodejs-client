import { 
  compress,
  createRpc,
  transfer,
} from "@lightprotocol/stateless.js";

import { PAYER_KEYPAIR, RPC_ENDPOINT } from "./constants";

const fromKeypair = PAYER_KEYPAIR;

const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

async function runTransferPulse() {
  try {
    // Compress lamports to self
    await compress(connection, fromKeypair, 10, fromKeypair.publicKey);
    
    while (true) {
      // Transfer 10 lamports to self
      const txId = await transfer(connection, fromKeypair, 10, fromKeypair, fromKeypair.publicKey);
      console.log(`Transaction Signature:`, txId);

      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

runTransferPulse();

