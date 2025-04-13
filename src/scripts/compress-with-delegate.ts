import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { compress, createMint } from "@lightprotocol/compressed-token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo as mintToSpl,
  approve,
} from "@solana/spl-token";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { Keypair } from "@solana/web3.js";

const payer = PAYER_KEYPAIR;
const delegate = Keypair.generate();
const recipient = Keypair.generate();

// Ensure you have light test-validator running
const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
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
  console.log(`create-mint success! txId: ${transactionSignature}`);

  // Get ATA
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  /// Mint SPL
  const mintTxId = await mintToSpl(
    connection,
    payer,
    mint,
    ata.address,
    payer.publicKey,
    1e5
  );
  console.log(`mint success! txId: ${mintTxId}`);

  const approveTxId = await approve(
    connection,
    payer,
    ata.address,
    delegate.publicKey,
    payer.publicKey,
    1e5
  );
  console.log(`approve success! txId: ${approveTxId}`);

  const compressTxId = await compress(
    connection,
    payer,
    mint,
    1e5,
    delegate,
    ata.address,
    recipient.publicKey
  );
  console.log(`compress success! txId: ${compressTxId}`);
})();
