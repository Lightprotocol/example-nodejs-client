import {
  createAccount,
  createRpc,
  LightSystemProgram,
  Rpc,
  selectStateTreeInfo,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { randomBytes } from "crypto";

const fromKeypair = PAYER_KEYPAIR;

const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  try {
    while (true) {
      const infos = await connection.getStateTreeInfos();
      const info = selectStateTreeInfo(infos);

      // Create account with random address
      const randomSeed = new Uint8Array(randomBytes(32));
      const txId = await createAccount(
        connection,
        fromKeypair,
        [randomSeed],
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
