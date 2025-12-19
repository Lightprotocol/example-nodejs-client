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
  selectMinCompressedTokenAccountsForTransfer,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram } from "@solana/web3.js";
import {
  PAYER_KEYPAIR,
  MINT_ADDRESS,
  BOB_KEYPAIR,
} from "../constants";
import { BN } from "bn.js";

const payer = PAYER_KEYPAIR;
const tokenRecipient = BOB_KEYPAIR!;
console.log(payer.publicKey.toBase58());
console.log(tokenRecipient.publicKey.toBase58());
/// Localnet, expects `light test-validator` to be running:
const connection: Rpc = createRpc();
const amount = new BN(100);

(async () => {
  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(payer.publicKey, {
      mint: MINT_ADDRESS,
    });

  console.log(
    compressedTokenAccounts.items
      .reduce((acc, curr) => acc.add(curr.parsed.amount), new BN(0))
      .toString()
  );

  const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
    compressedTokenAccounts.items,
    amount
  );

  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => bn(account.compressedAccount.hash))
  );

  const ix = await CompressedTokenProgram.transfer({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: tokenRecipient.publicKey,
    amount,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [payer]);

  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );

  const txId = await sendAndConfirmTx(connection, signedTx);
  console.log(`transfer success! txId: ${txId}`);
})();
