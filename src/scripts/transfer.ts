import {
  Rpc,
  buildAndSignTx,
  bn,
  dedupeSigner,
  sendAndConfirmTx,
  createRpc,
  selectStateTreeInfo,
} from "@lightprotocol/stateless.js";
import {
  CompressedTokenProgram,
  selectMinCompressedTokenAccountsForTransfer,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram } from "@solana/web3.js";
import {
  PAYER_KEYPAIR,
  RPC_ENDPOINT,
  MINT_ADDRESS,
  BOB_KEYPAIR,
} from "../constants";
const payer = PAYER_KEYPAIR;
const tokenRecipient = BOB_KEYPAIR;

/// Uncomment to use env:
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);
const amount = bn(100);

(async () => {
  // 1. Fetch token accounts
  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(payer.publicKey, {
      mint: MINT_ADDRESS,
    });

  // 2. Select token accounts
  const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
    compressedTokenAccounts.items,
    amount
  );

  // 3. Select state tree
  const info = selectStateTreeInfo(
    await connection.getCachedActiveStateTreeInfos()
  );

  // 4. Fetch validity proof
  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => bn(account.compressedAccount.hash))
  );

  // 5. Build instruction
  const ix = await CompressedTokenProgram.transfer({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: tokenRecipient.publicKey,
    amount,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
    outputStateTreeInfo: info,
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
