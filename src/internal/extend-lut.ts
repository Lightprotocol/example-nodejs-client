import {
  Rpc,
  buildAndSignTx,
  createRpc,
  dedupeSigner,
  getAllStateTreeInfos,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import {
  LUT_MAINNET_AUTHORITY_KEYPAIR,
  LUT_DEVNET_AUTHORITY_KEYPAIR,
  PAYER_KEYPAIR,
  RPC_ENDPOINT,
} from "../constants";
import { AddressLookupTableProgram, Keypair, PublicKey } from "@solana/web3.js";

const payer = PAYER_KEYPAIR;
const authority = LUT_DEVNET_AUTHORITY_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  // const address = new PublicKey("9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ");
  const address = new PublicKey("qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V");

  // const stateTreeLookupTableMainnet = new PublicKey(
  //   "7i86eQs3GSqHjN47WdWLTCGMW6gde1q96G2EVnUyK2st"
  // );
  // const nullifiedStateTreeLookupTableMainnet = new PublicKey(
  //   "H9QD4u1fG7KmkAzn2tDXhheushxFe1EcrjGGyEFXeMqT"
  // );

  const stateTreeLookupTableDevnet = new PublicKey(
    "8n8rH2bFRVA6cSGNDpgqcKHCndbFCT1bXxAQG89ejVsh"
  );
  const nullifiedStateTreeLookupTableDevnet = new PublicKey(
    "5dhaJLBjnVBQFErr8oiCJmcVsx3Zj6xDekGB2zULPsnP"
  );

  const info = await getAllStateTreeInfos({
    connection,
    stateTreeLUTPairs: [
      {
        stateTreeLookupTable: stateTreeLookupTableDevnet,
        nullifyLookupTable: nullifiedStateTreeLookupTableDevnet,
      },
    ],
  });

  await extend(
    payer,
    authority!,
    address,
    info.flatMap((i) => [i.tree])
  );
})();

async function extend(
  payer: Keypair,
  authority: Keypair,
  lookupTableAddress: PublicKey,
  addresses: PublicKey[]
) {
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    authority: authority.publicKey,
    lookupTable: lookupTableAddress,
    addresses,
  });
  const bhash = await connection.getLatestBlockhash();
  const tx = buildAndSignTx(
    [extendInstruction],
    payer,
    bhash.blockhash,
    dedupeSigner(payer, [authority])
  );
  await sendAndConfirmTx(connection, tx);

  console.log("extended lookup table:", lookupTableAddress.toBase58());
}
