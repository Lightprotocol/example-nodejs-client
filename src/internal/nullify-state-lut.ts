import {
  Rpc,
  createRpc,
  nullifyLookupTable,
  sleep,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT, AUTHORITY_KEYPAIR } from "../constants";
import { PublicKey } from "@solana/web3.js";
const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  // const data = await createStateTreeLookupTable({
  //   connection,
  //   payer,
  //   authority: AUTHORITY_KEYPAIR!,
  //   recentSlot: await connection.getSlot(),
  // });

  const treeToNullify = new PublicKey(
    "smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT"
  );

  await sleep(1000);
  const txId = await nullifyLookupTable({
    connection,
    fullStateTreeAddress: treeToNullify,
    nullifyLookupTableAddress: new PublicKey(
      "H9QD4u1fG7KmkAzn2tDXhheushxFe1EcrjGGyEFXeMqT"
    ),
    stateTreeLookupTableAddress: new PublicKey(
      "7i86eQs3GSqHjN47WdWLTCGMW6gde1q96G2EVnUyK2st"
    ),
    payer,
    authority: AUTHORITY_KEYPAIR!,
  });
  console.log("txId", txId);
})();
