import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  bn,
  Rpc,
  LightSystemProgram,
  getDefaultAddressTreeInfo,
  deriveAddressSeed,
  deriveAddress,
  TreeInfo,
  NewAddressParams,
} from "@lightprotocol/stateless.js";

// This is a helper function to create a cPDA for a given set of recipients.
// This lets you retry txns without handling spends client-side.
// The whole txn will fail if the same set of seeds (with the same order) is used a second time.
// Change the seeds to fit your use case.
export async function createIdempotentAirdropInstruction(
  rpc: Rpc,
  payer: PublicKey,
  mint: PublicKey,
  recipients: PublicKey[],
  outputStateTreeInfo: TreeInfo
): Promise<TransactionInstruction> {
  const { tree, queue } = getDefaultAddressTreeInfo();

  const seeds = recipients
    .map((recipient) => recipient.toBytes())
    .concat(mint.toBytes())
    .concat([new Uint8Array([1])]); // you can pick a discriminator so as to avoid collision in between different drops.

  const seed = deriveAddressSeed(seeds, LightSystemProgram.programId);
  const address = deriveAddress(seed, tree);

  const proof = await rpc.getValidityProofV0(undefined, [
    {
      address: bn(address.toBytes()),
      tree,
      queue,
    },
  ]);

  const params: NewAddressParams = {
    seed: seed,
    addressMerkleTreeRootIndex: proof.rootIndices[0],
    addressMerkleTreePubkey: proof.treeInfos[0].tree,
    addressQueuePubkey: proof.treeInfos[0].queue,
  };

  const ix = await LightSystemProgram.createAccount({
    payer,
    newAddressParams: params,
    newAddress: Array.from(address.toBytes()),
    recentValidityProof: proof.compressedProof,
    programId: LightSystemProgram.programId,
    outputStateTreeInfo,
  });

  return ix;
}
