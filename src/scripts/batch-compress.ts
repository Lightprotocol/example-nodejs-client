import * as web3 from "@solana/web3.js";
import { PAYER_KEYPAIR, MINT_ADDRESS } from "../constants";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
} from "@lightprotocol/compressed-token";

import {
  bn,
  buildAndSignTx,
  createRpc,
  dedupeSigner,
  pickRandomTreeAndQueue,
  Rpc,
  selectStateTreeInfo,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";

(async () => {
  try {
    /// Localnet, expects `light test-validator` to be running:
    const connection: Rpc = createRpc();
    const mintAddress = MINT_ADDRESS;
    const payer = PAYER_KEYPAIR;

    const activeStateTrees = await connection.getStateTreeInfos();
    const treeInfo = selectStateTreeInfo(activeStateTrees);
    console.log("Picked output state tree:", treeInfo.tree.toBase58());

    const tokenPoolInfo = selectTokenPoolInfo(
      await getTokenPoolInfos(connection, mintAddress)
    );

    // Get the source token account for the mint address
    const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      payer.publicKey
    );
    // Airdrop to random recipients addresses
    const airDropAddresses = [
      "GMPWaPPrCeZPse5kwSR3WUrqYAPrVZBSVwymqh7auNW7",
      "GySGrTgPtPfMtYoYTmwUdUDFwVJbFMfip7QZdhgXp8dy",
      "Bk1r2vcgX2uTzwV3AUyfRbSfGKktoQrQufBSrHzere74",
      "8BvkadZ6ycFNmQF7S1MHRvEVNb1wvDBFdjkAUnxjK9Ug",
      "EmxcvFKXsWLzUho8AhV9LCKeKRFHg5gAs4sKNJwhe5PF",
      "6mqdHkSpcvNexmECjp5XLt9V9KnSQre9TvbMLGr6sEPM",
      "3k4MViTWXBjFvoUZiJcNGPvzrqnTa41gcrbWCMMnV6ys",
      "2k6BfYRUZQHquPtpkyJpUx3DzM7W3K6H95igtJk8ztpd",
      "89jPyNNLCcqWn1RZThSS4jSqU5VCJkR5mAaSaVzuuqH4",
      "3MzSRLf9jSt6d1MFFMMtPfUcDY6XziRxTB8C5mfvgxXG",
      "9A1H6f3N8mpAPSdfqvYRD4cM1NwDZoMe3yF5DwibL2R2",
      "PtUAhLvUsVcoesDacw198SsnMoFNVskR5pT3QvsBSQw",
      "6C6W6WpgFK8TzTTMNCPMz2t9RaMs4XnkfB6jotrWWzYJ",
      "8sLy9Jy8WSh6boq9xgDeBaTznn1wb1uFpyXphG3oNjL5",
      "GTsQu2XCgkUczigdBFTWKrdDgNKLs885jKguyhkqdPgV",
      "85UK4bjC71Jwpyn8mPSaW3oYyEAiHPbESByq9s5wLcke",
      "9aEJT4CYHEUWwwSQwueZc9EUjhWSLD6AAbpVmmKDeP7H",
      "CY8QjRio1zd9bYWMKiVRrDbwVenf3JzsGf5km5zLgY9n",
      "CeHbdxgYifYhpB6sXGonKzmaejqEfq2ym5utTmB6XMVv",
      "4z1qss12DjUzGUkK1fFesqrUwrEVJJvzPMNkwqYnbAR5",
    ].map((address) => new web3.PublicKey(address));

    const amount = bn(111);
    const maxRecipientsPerInstruction = 5;
    const maxIxs = 3; // empirically determined (as of 12/15/2024)
    const instructions: web3.TransactionInstruction[] = [];

    instructions.push(
      web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 })
    );

    let i = 0;
    let ixCount = 0;
    while (i < airDropAddresses.length && ixCount < maxIxs) {
      const recipientBatch = airDropAddresses.slice(
        i,
        i + maxRecipientsPerInstruction
      );
      const compressIx = await CompressedTokenProgram.compress({
        payer: payer.publicKey,
        owner: payer.publicKey,
        source: sourceTokenAccount.address,
        toAddress: recipientBatch,
        amount: recipientBatch.map(() => amount),
        mint: mintAddress,
        outputStateTreeInfo: treeInfo,
        tokenPoolInfo,
      });
      instructions.push(compressIx);
      i += maxRecipientsPerInstruction;
      ixCount++;
    }

    // Use zk-compression LUT for your network
    // https://www.zkcompression.com/developers/protocol-addresses-and-urls#lookup-tables
    // Default: DA35UyyzGTonmEjsbw1VGRACpKxbKUPS2DvrG193QYHC
    const lookupTableAddress = new web3.PublicKey(
      "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V" // devnet
    );

    // Get the lookup table account
    const lookupTableAccount = (
      await connection.getAddressLookupTable(lookupTableAddress)
    ).value!;

    // Sign the transaction with the payer and mint keypair
    const additionalSigners = dedupeSigner(payer, []);

    const { blockhash } = await connection.getLatestBlockhash();

    const tx = buildAndSignTx(
      instructions,
      payer,
      blockhash,
      additionalSigners,
      [lookupTableAccount]
    );

    const serializedTx = tx.serialize();
    console.log(`Total transaction size: ${serializedTx.length} bytes`);
    console.log(
      `Instructions size (without serialization overhead): ${instructions.reduce(
        (acc, ix) => acc + ix.data.length,
        0
      )} bytes`
    );
    console.log(
      `Instructions size (with serialization overhead): ${tx.message.compiledInstructions.reduce(
        (acc, ix) => acc + 1 + 1 + ix.accountKeyIndexes.length + ix.data.length,
        0
      )} bytes`
    );

    const simulate = await connection.simulateTransaction(tx);

    if (simulate.value.err) {
      console.error("Simulation failed", simulate);
    } else {
      console.log("Simulation successful", simulate);
    }
    // Uncomment to send the transaction:
    // const txId = await sendAndConfirmTx(connection, tx);
    // console.log(`txId: ${txId}`);
  } catch (e) {
    console.error(`Batch compression failed:`, e);
  }
})();
