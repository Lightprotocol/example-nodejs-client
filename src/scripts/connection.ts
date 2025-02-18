import { Rpc } from "@lightprotocol/stateless.js";
import { RPC_ENDPOINT } from "../constants";
const stateless = require("@lightprotocol/stateless.js");

const connection: Rpc = stateless.createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  const slot = await connection.getSlot();
  console.log("Slot:", slot);

  const health = await connection.getIndexerHealth();
  console.log("Indexer Health:", health);
})();
