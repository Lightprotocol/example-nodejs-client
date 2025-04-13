import {
  bn,
  compress,
  createRpc,
  Rpc,
  selectStateTreeInfo,
  sleep,
  transfer,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";

const fromKeypair = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

const batchSize = 10;
(async () => {
  try {
    const infos = await connection.getCachedActiveStateTreeInfos();
    const info = selectStateTreeInfo(infos);
    console.log("Picked output state tree:", info.tree.toBase58());

    const compressedTxId = await compress(
      connection,
      fromKeypair,
      bn(1e5),
      fromKeypair.publicKey,
      info
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
            fromKeypair.publicKey,
            info,
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
      await sleep(2000);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
