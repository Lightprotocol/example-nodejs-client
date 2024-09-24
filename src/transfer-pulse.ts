import { 
  compress,
  createRpc,
  Rpc,
  transfer,
} from "@lightprotocol/stateless.js";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const fromKeypair = PAYER_KEYPAIR;
const connection : Rpc= createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

async function runTransferPulse() {
  try {
    // // Run this once to have compressed lamports!
    // Compress lamports to self
    // const txId = await compress(connection, fromKeypair, 10, fromKeypair.publicKey);
    // console.log("compressed signature:", txId);
    
    while (true) {
      // Transfer 10 lamports to self
//7FAR1Vgcwg7BX6XfUdWBdhMak6GnC2gokcZfrx2K4Qjx 29 mint: 9D2FgryFZ2Xn92wexNqcmS7KVXrm8SGRXnexsyGG73cZ
      const p = await connection.getCompressedTokenBalancesByOwner(new PublicKey("7FAR1Vgcwg7BX6XfUdWBdhMak6GnC2gokcZfrx2K4Qjx"))
      console.log(p.items.map(i => i.balance.toNumber() + " " + i.mint.toBase58()));
      throw new Error("stop");

      const txId = await transfer(connection, fromKeypair, 10, fromKeypair, fromKeypair.publicKey, undefined, {
        skipPreflight: false,
      });
      console.log(`Compressed SOL Transfer Success. Transaction Signature:`, txId);

      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

runTransferPulse();

