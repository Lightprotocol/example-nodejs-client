import { Rpc, createRpc } from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR } from "../constants";

/// Localnet, expects `light test-validator` to be running:
const connection: Rpc = createRpc();

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
