import { Rpc, createRpc } from "@lightprotocol/stateless.js";
import { createMint } from "@lightprotocol/compressed-token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo as mintToSpl,
} from "@solana/spl-token";
import { PAYER_KEYPAIR } from "../constants";

const payer = PAYER_KEYPAIR;
/// Localnet, expects `light test-validator` to be running:
const connection: Rpc = createRpc();

(async () => {
  /// airdrop lamports to pay fees
  // await confirmTx(
  //   connection,
  //   await connection.requestAirdrop(payer.publicKey, 1e7)
  // );

  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,
    9
  );
  console.log(
    `create-mint  success! txId: ${transactionSignature}, mint: ${mint.toBase58()}`
  );

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log(`ATA: ${ata.address}`);

  const mintTxId = await mintToSpl(
    connection,
    payer,
    mint,
    ata.address,
    payer.publicKey,
    BigInt("240000050")
  );
  console.log(`mint-spl success! txId: ${mintTxId}`);
})();
