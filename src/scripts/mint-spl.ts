import { Rpc, createRpc } from "@lightprotocol/stateless.js";
import { createMint } from "@lightprotocol/compressed-token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo as mintToSpl,
} from "@solana/spl-token";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";

const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  /// airdrop lamports to pay fees
  // await confirmTx(
  //   connection,
  //   await connection.requestAirdrop(payer.publicKey, 1e7)
  // );

  const activeStateTrees = await connection.getCachedActiveStateTreeInfo();

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

  await mintToSpl(
    connection,
    payer,
    mint,
    ata.address,
    payer.publicKey,
    BigInt("240000050")
  );
})();
