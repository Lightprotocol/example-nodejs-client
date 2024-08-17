import * as web3 from "@solana/web3.js";
import { RPC_ENDPOINT, PAYER_KEYPAIR, MINT_ADDRESS } from "./constants";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token";

import {
  bn,
  buildAndSignTx,
  createRpc,
  dedupeSigner,
  Rpc,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";

(async () => {
  // Send the transaction
  try {
    const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);
    const mintAddress = MINT_ADDRESS;

    // Todo: Use wallet connection to create browser keypair using signed message
    // and use it as payer and signer for all transactions.
    const payer = PAYER_KEYPAIR;

    // Get the source token account for the mint address
    const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      payer.publicKey
    );

    // Airdrop recipients addresses
    const airDropAddresses = [
      new web3.PublicKey("GMPWaPPrCeZPse5kwSR3WUrqYAPrVZBSVwymqh7auNW7"),
      new web3.PublicKey("GySGrTgPtPfMtYoYTmwUdUDFwVJbFMfip7QZdhgXp8dy"),
      new web3.PublicKey("Bk1r2vcgX2uTzwV3AUyfRbSfGKktoQrQufBSrHzere74"),
      new web3.PublicKey("8BvkadZ6ycFNmQF7S1MHRvEVNb1wvDBFdjkAUnxjK9Ug"),
      new web3.PublicKey("EmxcvFKXsWLzUho8AhV9LCKeKRFHg5gAs4sKNJwhe5PF"),
      new web3.PublicKey("6mqdHkSpcvNexmECjp5XLt9V9KnSQre9TvbMLGr6sEPM"),
      new web3.PublicKey("3k4MViTWXBjFvoUZiJcNGPvzrqnTa41gcrbWCMMnV6ys"),
      new web3.PublicKey("2k6BfYRUZQHquPtpkyJpUx3DzM7W3K6H95igtJk8ztpd"),
      new web3.PublicKey("89jPyNNLCcqWn1RZThSS4jSqU5VCJkR5mAaSaVzuuqH4"),
      new web3.PublicKey("3MzSRLf9jSt6d1MFFMMtPfUcDY6XziRxTB8C5mfvgxXG"),
      new web3.PublicKey("9A1H6f3N8mpAPSdfqvYRD4cM1NwDZoMe3yF5DwibL2R2"),
      new web3.PublicKey("PtUAhLvUsVcoesDacw198SsnMoFNVskR5pT3QvsBSQw"),
      new web3.PublicKey("6C6W6WpgFK8TzTTMNCPMz2t9RaMs4XnkfB6jotrWWzYJ"),
      new web3.PublicKey("8sLy9Jy8WSh6boq9xgDeBaTznn1wb1uFpyXphG3oNjL5"),
      new web3.PublicKey("GTsQu2XCgkUczigdBFTWKrdDgNKLs885jKguyhkqdPgV"),
      new web3.PublicKey("85UK4bjC71Jwpyn8mPSaW3oYyEAiHPbESByq9s5wLcke"),
      new web3.PublicKey("9aEJT4CYHEUWwwSQwueZc9EUjhWSLD6AAbpVmmKDeP7H"),
      new web3.PublicKey("CY8QjRio1zd9bYWMKiVRrDbwVenf3JzsGf5km5zLgY9n"),
      new web3.PublicKey("CeHbdxgYifYhpB6sXGonKzmaejqEfq2ym5utTmB6XMVv"),
      new web3.PublicKey("4z1qss12DjUzGUkK1fFesqrUwrEVJJvzPMNkwqYnbAR5"),
    ];

    // Ammount to airdrop per recipient
    const amount = bn(111);

    const instructions: web3.TransactionInstruction[] = [];

    // Set the compute unit limit to maximum of 500_000 compute units and add it to the transaction
    const budgetIX = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
    });
    instructions.push(budgetIX);

    const maxRecipients = 6;

    // Compress tokens for each airdrop address and add it to the transaction
    const compressIx = await CompressedTokenProgram.compress({
      payer: payer.publicKey, // The payer of the transaction.
      owner: payer.publicKey, // owner of the *uncompressed* token account.
      source: sourceTokenAccount.address, // source (associated) token account address.
      toAddress: airDropAddresses.slice(0, maxRecipients), // address to send the compressed tokens to.
      amount: airDropAddresses.slice(0, maxRecipients).map(() => amount), // amount of tokens to compress.
      mint: mintAddress, // Mint address of the token to compress.
    });
    instructions.push(compressIx);

    // Use zk-compression LUT
    // https://www.zkcompression.com/developers/devnet-addresses#lookup-tables
    // Default: DA35UyyzGTonmEjsbw1VGRACpKxbKUPS2DvrG193QYHC
    const lookupTableAddress = new web3.PublicKey(
      "DA35UyyzGTonmEjsbw1VGRACpKxbKUPS2DvrG193QYHC"
    );

    // Get the lookup table account
    const lookupTableAccount = (
      await connection.getAddressLookupTable(lookupTableAddress)
    ).value!;

    // Sign the transaction with the payer and mint keypair
    const additionalSigners = dedupeSigner(payer, []);

    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = buildAndSignTx(
      instructions,
      payer,
      blockhash,
      additionalSigners,
      [lookupTableAccount]
    );

    console.log(`Transaction size: ${tx.serialize().length} bytes`);
    const simulate = await connection.simulateTransaction(tx);

    if (simulate.value.err) {
      console.error("Simulation failed", simulate);
    } else {
      console.log("Simulation successful", simulate);
    }
  } catch (e) {
    console.error(`Transaction failed to send`, e);
  }
})();
