import {
  bn,
  compress,
  createAccountWithLamports,
  createRpc,
  LightSystemProgram,
  pickRandomTreeAndQueue,
  Rpc,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { randomBytes } from "crypto";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  try {
    while (true) {
      const activeStateTrees = await connection.getCachedActiveStateTreeInfo();

      const { tree, queue } = pickRandomTreeAndQueue(activeStateTrees);
      console.log("Picked output state tree:", tree.toBase58());
      const compressedTxId = await compress(
        connection,
        fromKeypair,
        bn(10),
        fromKeypair.publicKey,
        tree
      );
      console.log("Compressed TxId", compressedTxId);
      // Creat account with random address
      const txId = await createAccountWithLamports(
        connection,
        fromKeypair,
        [randomBytes(32)],
        10,
        LightSystemProgram.programId,
        undefined,
        undefined,
        tree
      );
      console.log(
        `Compressed Account Creation Success. Transaction Signature:`,
        txId
      );

      // Wait 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
