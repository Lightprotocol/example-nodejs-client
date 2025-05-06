import {
  bn,
  buildAndSignTx,
  sendAndConfirmTx,
  dedupeSigner,
  Rpc,
  createRpc,
} from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectMinCompressedTokenAccountsForTransfer,
  selectTokenPoolInfosForDecompression,
} from "@lightprotocol/compressed-token";
import { MINT_ADDRESS, PAYER_KEYPAIR, RPC_ENDPOINT } from "../shared/constants";

const connection: Rpc = createRpc(RPC_ENDPOINT);

const payer = PAYER_KEYPAIR;
const owner = PAYER_KEYPAIR;
const mint = MINT_ADDRESS;
const amount = 1e5;

(async () => {
  /// 1. Fetch compressed token accounts
  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(owner.publicKey, {
      mint,
    });

  /// 2. Select
  const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
    compressedTokenAccounts.items,
    bn(amount)
  );

  /// 3. Fetch validity proof
  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => account.compressedAccount.hash)
  );

  /// 4. Fetch token pool infos
  const tokenPoolInfos = await getTokenPoolInfos(connection, mint);

  /// 5. Select
  const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
    tokenPoolInfos,
    amount
  );

  /// 6. Build instruction
  const ix = await CompressedTokenProgram.decompress({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: owner.publicKey,
    amount,
    tokenPoolInfos: selectedTokenPoolInfos,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });

  /// 7. Sign, send, and confirm
  const { blockhash } = await connection.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [owner]);
  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );
  return await sendAndConfirmTx(connection, signedTx);
})();
