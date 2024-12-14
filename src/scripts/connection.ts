import { RPC_ENDPOINT } from "../constants";

const stateless = require("@lightprotocol/stateless.js");

const connection = stateless.createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

async function main() {
  let slot = await connection.getSlot();
  console.log(slot);

  let health = await connection.getIndexerHealth(slot);
  console.log(health);
  // "Ok"
}

main();
