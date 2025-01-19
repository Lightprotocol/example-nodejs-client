import {
  bn,
  compress,
  createAccountWithLamports,
  createRpc,
  LightSystemProgram,
  Rpc,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { randomBytes } from "crypto";
import { PublicKey } from "@solana/web3.js";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

const trees = [
  "smt2rJAFdyJJupwMKAqTNAJwvjhmiZ4JYGZmbVRw1Ho",
  "smt3AFtReRGVcrP11D6bSLEaKdUmrGfaTNowMVccJeu",
  "smt4vjXvdjDFzvRMUxwTWnSy4c7cKkMaHuPrGsdDH7V",
  "smt5uPaQT9n6b1qAkgyonmzRxtuazA53Rddwntqistc",
  "smt6ukQDSPPYHSshQovmiRUjG9jGFq2hW9vgrDFk5Yz",
  "smt7onMFkvi3RbyhQCMajudYQkB1afAFt9CDXBQTLz6",
  "smt8TYxNy8SuhAdKJ8CeLtDkr2w6dgDmdz5ruiDw9Y9",
  "smt9ReAYRF5eFjTd5gBJMn5aKwNRcmp3ub2CQr2vW7j",
  "smtAvYA5UbTRyKAkAj5kHs1CmrA42t6WkVLi4c6mA1f",
];

(async () => {
  try {
    while (true) {
      const pseudoRandomTree = trees[Math.floor(Math.random() * trees.length)];
      const compressedTxId = await compress(
        connection,
        fromKeypair,
        bn(10),
        fromKeypair.publicKey,
        new PublicKey(pseudoRandomTree)
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
        new PublicKey(pseudoRandomTree)
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
