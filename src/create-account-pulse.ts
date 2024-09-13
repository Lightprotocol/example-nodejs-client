import { 
  compress,
  createAccount,
  createRpc,
  LightSystemProgram,
  Rpc,
  transfer,
} from "@lightprotocol/stateless.js";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";

const fromKeypair = PAYER_KEYPAIR;

const connection : Rpc= createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

async function runCreateAccountPulse() {
  try {
    // // Run this once to have compressed lamports!
    // Compress lamports to self
    // const txId = await compress(connection, fromKeypair, 10, fromKeypair.publicKey);
    // console.log("compressed signature:", txId);
    while (true) {
      // Creat account with random address
      const txId = await createAccount(connection, fromKeypair, randomBytes(32), LightSystemProgram.programId);
      console.log(`Compressed Account Creation Success. Transaction Signature:`, txId);

      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

runCreateAccountPulse();

