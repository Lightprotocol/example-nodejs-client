import { confirmTx, selectStateTreeInfo } from "@lightprotocol/stateless.js";
import dotenv from "dotenv";

dotenv.config();

/// Compressing SOL
const {
  LightSystemProgram,
  buildAndSignTx,
  createRpc,
  sendAndConfirmTx,
} = require("@lightprotocol/stateless.js");

const { ComputeBudgetProgram, Keypair } = require("@solana/web3.js");

const fromKeypair = Keypair.generate();

/// Localnet, expects `light test-validator` to be running:
const connection = createRpc();

(async () => {
  /// airdrop lamports to pay tx fees
  await confirmTx(
    connection,
    await connection.requestAirdrop(fromKeypair.publicKey, 10e9)
  );

  /// Fetch latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  /// Get state tree info
  const stateTreeInfos = await connection.getStateTreeInfos();
  const treeInfo = selectStateTreeInfo(stateTreeInfos);

  /// Compress lamports to self
  const ix = await LightSystemProgram.compress({
    payer: fromKeypair.publicKey,
    toAddress: fromKeypair.publicKey,
    lamports: 1_000_000_000,
    outputStateTreeInfo: treeInfo,
  });

  /// Create a VersionedTransaction and sign it
  const tx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 }), ix],
    fromKeypair,
    blockhash,
    []
  );

  /// Confirm
  const txId = await sendAndConfirmTx(connection, tx);
  console.log("Transaction Signature:", txId);
})();
