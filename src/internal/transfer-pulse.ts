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
const getRandTree = () => {
  return trees[Math.floor(Math.random() * trees.length)];
};

const batchSize = 100;
(async () => {
  try {
    const compressedTxId = await compress(
      connection,
      fromKeypair,
      bn(10),
      fromKeypair.publicKey,
      new PublicKey(getRandTree())
    );
    while (true) {
      console.log("Compressed TxId", compressedTxId);
      const transferPromises = [];
      for (let i = 0; i < batchSize; i++) {
        transferPromises.push(
          transfer(
            connection,
            fromKeypair,
            10,
            fromKeypair,
            fromKeypair.publicKey,
            new PublicKey(getRandTree()),
            {
              skipPreflight: false,
            }
          )
        );
      }
      const txIds = await Promise.all(transferPromises);
      txIds.forEach((txId) => {
        console.log(
          `Compressed SOL Transfer Success. Transaction Signature:`,
          txId
        );
      });

      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
