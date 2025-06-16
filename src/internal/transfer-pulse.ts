import {
  bn,
  compress,
  createRpc,
  pickRandomTreeAndQueue,
  Rpc,
  selectStateTreeInfo,
  sleep,
  transfer,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { PublicKey } from "@solana/web3.js";
import {
  getTokenPoolInfos,
  selectTokenPoolInfo,
} from "@lightprotocol/compressed-token";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT);

const batchSize = 10;
(async () => {
  try {
    const stateTreeInfos = await connection.getStateTreeInfos();
    const treeInfo = selectStateTreeInfo(stateTreeInfos);
    console.log("Picked output state tree:", treeInfo.tree.toBase58());

    const compressedTxId = await compress(
      connection,
      fromKeypair,
      bn(1e5),
      fromKeypair.publicKey,
      treeInfo
    );
    while (true) {
      console.log("Compressed TxId", compressedTxId);
      const transferPromises = [];
      for (let i = 0; i < batchSize; i++) {
        console.log("sent", i);
        await sleep(100);
        transferPromises.push(
          transfer(
            connection,
            fromKeypair,
            1,
            fromKeypair,
            fromKeypair.publicKey
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
      await sleep(2000);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
