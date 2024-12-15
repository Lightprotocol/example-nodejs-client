import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { createMint } from "@lightprotocol/compressed-token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo as mintToSpl,
} from "@solana/spl-token";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";

const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

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

  // Get ATA
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
