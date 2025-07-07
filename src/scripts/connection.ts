import { Rpc } from "@lightprotocol/stateless.js";
import { RPC_ENDPOINT, PAYER_KEYPAIR } from "../constants";

const stateless = require("@lightprotocol/stateless.js");

const connection: Rpc = stateless.createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  const slot = await connection.getSlot();
  console.log("Slot:", slot);

  const health = await connection.getIndexerHealth();
  console.log("Indexer Health:", health);

  console.log("connection", connection.rpcEndpoint);
  const accs = await connection.getCompressedTokenAccountsByOwner(
    PAYER_KEYPAIR.publicKey
  );
  console.log("compressed token accounts: ", accs);
})();
