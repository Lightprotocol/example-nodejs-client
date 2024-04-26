import {
  LightSystemProgram,
  Rpc,
  bn,
  buildAndSignTx,
  compress,
  confirmTx,
  createRpc,
  decompress,
  defaultTestStateTreeAccounts,
  selectMinCompressedSolAccountsForTransfer,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";

/// hardcode these if required
const payer = Keypair.generate();
const tokenRecipient = Keypair.generate();
const lamportsRecipient = Keypair.generate();
const connection: Rpc = createRpc();

async function main(): Promise<void> {
  try {
    await confirmTx(
      connection,
      await connection.requestAirdrop(payer.publicKey, 10e9)
    );

    await confirmTx(
      connection,
      await connection.requestAirdrop(lamportsRecipient.publicKey, 10e9)
    );

    await confirmTx(
      connection,
      await connection.requestAirdrop(tokenRecipient.publicKey, 10e9)
    );

    await emitSolEvents();

    await emitTokenEvents();

    // You can now use Rpc methods to read zk compressed state
    // Check the Rpc class / inline documentation for available methods.
    // Rpc also extends the regular web3.js Connection.
    // Example:
    // await connection.getCompressedAccountsByOwner(
    //   payer.publicKey
    // );
    // await connection.getCompressedTokenBalancesByOwner(payer.publicKey, {
    //   mint: your_mint_address,
    // });
    // ...
  } catch (error) {
    console.error("Error:", error);
  }
}

/// 1. payer compresses 1e9 lamports to itself
/// 2. payer transfers 4e8 lamports to lamportsRecipient
/// 3. lamportsRecipient decompresses 3e8 lamports to itself
async function emitSolEvents() {
  await compress(connection, payer, 1e9, payer.publicKey);

  await transferLamports(payer, 4e8, lamportsRecipient.publicKey);

  await decompress(
    connection,
    lamportsRecipient,
    3e8,
    lamportsRecipient.publicKey
  );
}

/// 1. payer creates random mint,
/// 2. payer mints to itself,
/// 3. payer transfers to tokenRecipient
/// 4. tokenRecipient transfers to payer
async function emitTokenEvents() {
  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer,
    9
  );

  const mintToTxId = await mintTo(
    connection,
    payer,
    mint,
    payer.publicKey,
    payer,
    1e9
  );

  const transferTxId = await transfer(
    connection,
    payer,
    mint,
    7e8,
    payer,
    tokenRecipient.publicKey
  );
  const transferTxId2 = await transfer(
    connection,
    tokenRecipient,
    mint,
    6e8,
    tokenRecipient,
    payer.publicKey
  );

  console.log("Transaction Signature:", transactionSignature);
  console.log("Mint To Transaction Signature:", mintToTxId);
  console.log("Transfer Transaction Signature:", transferTxId);
  console.log("Transfer Transaction Signature 2:", transferTxId2);
}

async function transferLamports(
  owner: Keypair,
  lamports: number,
  toAddress: PublicKey
) {
  const compressedAccounts = await connection.getCompressedAccountsByOwner(
    owner.publicKey
  );

  const [inputAccounts] = selectMinCompressedSolAccountsForTransfer(
    compressedAccounts,
    lamports
  );

  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => bn(account.hash))
  );

  const ix = await LightSystemProgram.transfer({
    payer: payer.publicKey,
    inputCompressedAccounts: inputAccounts,
    toAddress,
    lamports,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
    outputStateTrees: defaultTestStateTreeAccounts().merkleTree,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }), ix],
    payer,
    blockhash
  );
  const txId = await sendAndConfirmTx(connection, signedTx);
  console.log("Transfer lamports Signature:", txId);
  return txId;
}

main();
