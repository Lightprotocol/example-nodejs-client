import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { createMint } from "@lightprotocol/compressed-token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo as mintToSpl,
} from "@solana/spl-token";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { connect } from "http2";

const payer = PAYER_KEYPAIR;
// const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);
const connection: Rpc = createRpc();

const main = async () => {
  /// airdrop lamports to pay fees
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, 1e7)
  );

  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,
    9
  );
  console.log(`create-mint  success! txId: ${transactionSignature}`);

  // connection.getcompressedAccountsByOwnerWithCursor
  // Get ATA
  // const mint = new PublicKey("9gSxQyxRLW6BaVhWYSjKyetnBaUvhqwBnTiShzBS7CJt");
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log(`ATA: ${ata.address}`);
  /// Mint SPL
  await mintToSpl(connection, payer, mint, ata.address, payer.publicKey, 1e5);
};

main();
