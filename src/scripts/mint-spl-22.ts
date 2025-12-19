import {
  Rpc,
  createRpc,
  pickRandomTreeAndQueue,
  selectStateTreeInfo,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";

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
import { PAYER_KEYPAIR } from "../constants";
import {
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import {
  compress,
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
  transfer,
} from "@lightprotocol/compressed-token";

const payer = PAYER_KEYPAIR;
/// Localnet, expects `light test-validator` to be running:
const connection: Rpc = createRpc();

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

  const activeStateTrees = await connection.getStateTreeInfos();
  const treeInfo = selectStateTreeInfo(activeStateTrees);
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

  const instructions = [
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
    createTokenPoolIx,
  ];

  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions,
  }).compileToV0Message();

  const mintTransaction = new VersionedTransaction(messageV0);
  mintTransaction.sign([payer, mint]);

  const txId = await sendAndConfirmTx(connection, mintTransaction);

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
    treeInfo,
    selectTokenPoolInfo(await getTokenPoolInfos(connection, mint.publicKey))
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
