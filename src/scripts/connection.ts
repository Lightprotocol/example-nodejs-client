import { Rpc, createRpc } from "@lightprotocol/stateless.js";
import { RPC_ENDPOINT } from "../constants";

const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  const slot = await connection.getSlot();
  console.log("Slot:", slot);

  const health = await connection.getIndexerHealth();
  console.log("Indexer Health:", health);
})();
