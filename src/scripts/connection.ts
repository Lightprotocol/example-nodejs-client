import { Rpc } from "@lightprotocol/stateless.js";
import { MINT_ADDRESS, RPC_ENDPOINT } from "../constants";
import { PublicKey } from "@solana/web3.js";
const stateless = require("@lightprotocol/stateless.js");

const connection: Rpc = stateless.createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  const slot = await connection.getSlot();
  console.log("Slot:", slot);

  const health = await connection.getIndexerHealth();
  console.log("Indexer Health:", health);

  // const accs = await connection.getCompressedAccountsByOwner(
  //   new PublicKey("6MZszp7ihPjUeoi8RJs9NNC4jBxi7beiqvXHJhxd7fe")
  // );
  console.log("connection", connection.rpcEndpoint);
  const accs = await connection.getCompressedTokenAccountsByOwner(
    new PublicKey("6MZszp7ihPjUeoi8RJs9NNC4jBxi7beiqvXHJhxd7fe"),
    {
      mint: MINT_ADDRESS,
      // mint: new PublicKey("APMHh8w6ZWLCv4M5daKAvGzcFLemFPvrNfdHiTLEYghK"),
    }
  );
  console.log(accs);
})();
