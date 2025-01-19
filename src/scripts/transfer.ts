import {
  Rpc,
  buildAndSignTx,
  bn,
  dedupeSigner,
  sendAndConfirmTx,
  createRpc,
} from "@lightprotocol/stateless.js";
import {
  CompressedTokenProgram,
  createMint,
  mintTo,
  selectMinCompressedTokenAccountsForTransfer,
  selectMinCompressedTokenAccountsForTransferOrPartial,
  transfer,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram, Keypair } from "@solana/web3.js";
import {
  PAYER_KEYPAIR,
  RPC_ENDPOINT,
  MINT_ADDRESS,
  BOB_KEYPAIR,
} from "../constants";
import { BN } from "bn.js";
const payer = BOB_KEYPAIR!;
const tokenRecipient = PAYER_KEYPAIR;
console.log(payer.publicKey.toBase58());
console.log(tokenRecipient.publicKey.toBase58());
/// Localnet, expects `light test-validator` to be running:
// const connection: Rpc = createRpc();

/// Uncomment to use env:
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  /// Transfer compressed tokens
  // const transferTxId = await transfer(
  //   connection,
  //   payer,
  //   MINT_ADDRESS,
  //   555,
  //   payer,
  //   tokenRecipient.publicKey
  // );

  // console.log(`transfer success! txId: ${transferTxId}`);

  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(payer.publicKey, {
      mint: MINT_ADDRESS,
    });

  console.log(
    compressedTokenAccounts.items
      .reduce((acc, curr) => acc.add(curr.parsed.amount), new BN(0))
      .toString()
  );

  const [inputAccounts] = selectMinCompressedTokenAccountsForTransferOrPartial(
    compressedTokenAccounts.items,
    new BN(555)
  );
  console.log(
    inputAccounts
      .reduce((acc, curr) => acc.add(curr.parsed.amount), new BN(0))
      .toString()
  );

  return;
  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => bn(account.compressedAccount.hash))
  );

  const ix = await CompressedTokenProgram.transfer({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: tokenRecipient.publicKey,
    amount: new BN(555),
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
    outputStateTrees: undefined,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [payer]);
  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );

  const txId = await sendAndConfirmTx(connection, signedTx);
  console.log(`transfer success! txId: ${txId}`);
})();
