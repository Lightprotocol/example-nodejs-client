import {
  Rpc,
  createRpc,
  extendStateTreeLookupTable,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT, AUTHORITY_KEYPAIR } from "../constants";
import { PublicKey } from "@solana/web3.js";
import { smts, nfqs, cpis } from "./tree-values";
const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  // check that all accounts are unique, and initialized.
  const allAddresses = [...smts, ...nfqs, ...cpis];
  const uniqueAddresses = new Set(allAddresses);
  if (uniqueAddresses.size !== allAddresses.length) {
    throw new Error("Duplicate addresses found");
  }
  const mid = Math.ceil(allAddresses.length / 2);
  const [firstHalf, secondHalf] = [
    allAddresses.slice(0, mid),
    allAddresses.slice(mid),
  ];

  const [infos1, infos2] = await Promise.all([
    connection.getMultipleAccountsInfo(firstHalf, "confirmed"),
    connection.getMultipleAccountsInfo(secondHalf, "confirmed"),
  ]);

  const uninitializedAddresses = [
    ...firstHalf.filter((_, i) => !infos1[i]),
    ...secondHalf.filter((_, i) => !infos2[i]),
  ];

  if (uninitializedAddresses.length > 0) {
    console.log(
      `Found ${uninitializedAddresses.length} uninitialized addresses`
    );
    const initializedAddresses = allAddresses.filter(
      (addr) => !uninitializedAddresses.includes(addr)
    );
    console.log(
      `Initialized addresses: ${initializedAddresses
        .map((addr) => addr.toBase58())
        .join(", ")}`
    );
    throw new Error(
      `Addresses not initialized: ${uninitializedAddresses
        .map((addr) => addr.toBase58())
        .join(", ")}`
    );
  }
  // the 4th char of each address is consistent between index at smts, nfqs, and cpis.
  for (let i = 0; i < smts.length; i++) {
    if (
      smts[i].toBase58()[3].toLowerCase() !==
      nfqs[i].toBase58()[3].toLowerCase()
    ) {
      throw new Error(
        `Inconsistent 4th char between smt ${smts[i].toBase58()} and nfq ${nfqs[
          i
        ].toBase58()}`
      );
    }
    if (
      smts[i].toBase58()[3].toLowerCase() !==
      cpis[i].toBase58()[3].toLowerCase()
    ) {
      throw new Error(
        `Inconsistent 4th char between smt ${smts[i].toBase58()} and cpi ${cpis[
          i
        ].toBase58()}`
      );
    }
  }

  // len is 35
  if (smts.length !== 15 || nfqs.length !== 15 || cpis.length !== 15) {
    throw new Error("Length of smts, nfqs, or cpis is not 15");
  }
  // return;

  // const data = await createStateTreeLookupTable({
  //   connection,
  //   payer,
  //   authority: AUTHORITY_KEYPAIR!,
  //   recentSlot: await connection.getSlot(),
  // });

  const sliceSize = 5;
  const maxSlice = 3;
  for (let i = 0; i < Math.min(smts.length / sliceSize, maxSlice); i++) {
    const start = i * sliceSize;
    const end = start + sliceSize;

    await extendStateTreeLookupTable({
      connection,
      tableAddress: new PublicKey(
        "7i86eQs3GSqHjN47WdWLTCGMW6gde1q96G2EVnUyK2st"
      ),
      newStateTreeAddresses: smts.slice(start, end),
      newQueueAddresses: nfqs.slice(start, end),
      newCpiContextAddresses: cpis.slice(start, end),
      payer,
      authority: AUTHORITY_KEYPAIR!,
    });
  }
})();
