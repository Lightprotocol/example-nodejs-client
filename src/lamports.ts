import { confirmTx } from "@lightprotocol/stateless.js";

/// Compressing SOL
const {
  LightSystemProgram,
  buildAndSignTx,
  createRpc,
  defaultTestStateTreeAccounts,
  sendAndConfirmTx,
} = require("@lightprotocol/stateless.js");

const { ComputeBudgetProgram, Keypair } = require("@solana/web3.js");

const fromKeypair = Keypair.generate();

/// Localnet, expects `light test-validator` to be running:
const connection = createRpc();

/// Uncomment to use Testnet:
// const connection = createRpc(
//   "https://zk-testnet.helius.dev:8899", // rpc
//   "https://zk-testnet.helius.dev:8784", // zk compression rpc
//   "https://zk-testnet.helius.dev:3001" // prover
// );

(async () => {
  /// airdrop lamports to pay tx fees
  await confirmTx(
    connection,
    await connection.requestAirdrop(fromKeypair.publicKey, 10e9)
  );

  /// Fetch latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  /// Compress lamports to self
  const ix = await LightSystemProgram.compress({
    payer: fromKeypair.publicKey,
    toAddress: fromKeypair.publicKey,
    lamports: 1_000_000_000,
    outputStateTree: defaultTestStateTreeAccounts().merkleTree,
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
