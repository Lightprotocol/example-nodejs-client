import {
  bn,
  compress,
  createAccountWithLamports,
  createRpc,
  LightSystemProgram,
  Rpc,
  selectStateTreeInfo,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { randomBytes } from "crypto";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  try {
    while (true) {
      const infos = await connection.getCachedActiveStateTreeInfos();
      const info = selectStateTreeInfo(infos);
      console.log("Picked output state tree:", info.tree.toBase58());
      const compressedTxId = await compress(
        connection,
        fromKeypair,
        bn(10),
        fromKeypair.publicKey,
        info
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
        info
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
