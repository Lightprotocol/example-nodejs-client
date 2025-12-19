import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";
import { Keypair } from "@solana/web3.js";
import { PAYER_KEYPAIR } from "../constants";
const payer = PAYER_KEYPAIR;
const tokenRecipient = Keypair.generate();

/// Localnet, expects `light test-validator` to be running:
const connection: Rpc = createRpc();

/// Uncomment to use custom RPC (e.g. mainnet/devnet):
// const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  /// airdrop lamports to pay fees
  // await confirmTx(
  //   connection,
  //   await connection.requestAirdrop(payer.publicKey, 1e7)
  // );

  await confirmTx(
    connection,
    await connection.requestAirdrop(tokenRecipient.publicKey, 1e5)
  );
  /// Create compressed-token mint
  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,
    9
  );

  console.log(`create-mint success! txId: ${transactionSignature}`);

  /// Mint compressed tokens
  const mintToTxId = await mintTo(
    connection,
    payer,
    mint,
    payer.publicKey,
    payer,
    1e7
  );

  console.log(`mint-to success! txId: ${mintToTxId}`);

  /// Transfer compressed tokens
  const transferTxId = await transfer(
    connection,
    payer,
    mint,
    7e5,
    payer,
    tokenRecipient.publicKey
  );

  console.log(`transfer success! txId: ${transferTxId}`);
})();
