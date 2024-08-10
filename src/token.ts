import {
  LightSystemProgram,
  Rpc,
  confirmTx,
  createAccount,
  createRpc,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";
import { Keypair } from "@solana/web3.js";
import { randomBytes } from "crypto";
import { RPC_ENDPOINT } from "./constants";

const payer = Keypair.generate();
console.log("payer", payer.publicKey.toBase58());
const tokenRecipient = Keypair.generate();

/// Localnet, expects `light test-validator` to be running:
// const connection: Rpc = createRpc();

/// Uncomment to use Testnet:
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

const main = async () => {
  /// airdrop lamports to pay fees
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, 10e9)
  );

  await confirmTx(
    connection,
    await connection.requestAirdrop(tokenRecipient.publicKey, 1e6)
  );
  /// Create compressed-token mint
  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,
    9
  );

  console.log(`create-mint  success! txId: ${transactionSignature}`);

  /// Mint compressed tokens
  const mintToTxId = await mintTo(
    connection,
    payer,
    mint,
    payer.publicKey,
    payer,
    1e9
  );

  console.log(`mint-to      success! txId: ${mintToTxId}`);

  /// Transfer compressed tokens
  const transferTxId = await transfer(
    connection,
    payer,
    mint,
    7e8,
    payer,
    tokenRecipient.publicKey
  );

  console.log(`transfer     success! txId: ${transferTxId}`);
};

main();
