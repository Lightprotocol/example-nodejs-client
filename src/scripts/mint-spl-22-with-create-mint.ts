import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import {
  compress,
  CompressedTokenProgram,
  transfer,
} from "@lightprotocol/compressed-token";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo as mintToSpl,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMetadataPointerInstruction,
  ExtensionType,
  getMintLen,
  LENGTH_SIZE,
  TYPE_SIZE,
} from "@solana/spl-token";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import {
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  const mint = Keypair.generate();
  const decimals = 9;

  const metadata: TokenMetadata = {
    mint: mint.publicKey,
    name: "TEST_CTOKEN_22",
    symbol: "CTOK22",
    uri: "https://genius.com/Rick-astley-never-gonna-give-you-up-lyrics",
    additionalMetadata: [["rick", "rolled"]],
  };

  const mintLen = getMintLen([ExtensionType.MetadataPointer]);

  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

  // airdrop for gas
  // await confirmTx(
  //   connection,
  //   await connection.requestAirdrop(payer.publicKey, 1e7)
  // );

  const mintLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen
  );

  const [createMintAccountIx, initializeMintIx, createTokenPoolIx] =
    await CompressedTokenProgram.createMint({
      feePayer: payer.publicKey,
      authority: payer.publicKey,
      mint: mint.publicKey,
      decimals,
      freezeAuthority: null,
      rentExemptBalance: mintLamports,
      tokenProgramId: TOKEN_2022_PROGRAM_ID,
      mintSize: mintLen,
    });

  const mintTransaction = new Transaction().add(
    createMintAccountIx,
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      payer.publicKey,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    initializeMintIx,
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: mint.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    }),
    createTokenPoolIx
  );

  const txId = await sendAndConfirmTransaction(connection, mintTransaction, [
    payer,
    mint,
  ]);
  console.log(`txId: ${txId}`);
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint.publicKey,
    payer.publicKey,
    undefined,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log(`ATA: ${ata.address}`);
  /// Mint SPL
  const mintTxId = await mintToSpl(
    connection,
    payer,
    mint.publicKey,
    ata.address,
    payer.publicKey,
    1e5,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`mint-spl success! txId: ${mintTxId}`);

  const compressedTokenTxId = await compress(
    connection,
    payer,
    mint.publicKey,
    1e5,
    payer,
    ata.address,
    payer.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`compressed-token success! txId: ${compressedTokenTxId}`);

  // compressed-transfers do not require passing of token program id.
  const transferCompressedTxId = await transfer(
    connection,
    payer,
    mint.publicKey,
    1e5,
    payer,
    payer.publicKey // self-transfer
  );
  console.log(`transfer-compressed success! txId: ${transferCompressedTxId}`);
})();
