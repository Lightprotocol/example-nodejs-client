import * as web3 from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
} from "@lightprotocol/compressed-token";
import {
  bn,
  buildAndSignTx,
  calculateComputeUnitPrice,
  createRpc,
  dedupeSigner,
  Rpc,
  selectStateTreeInfo,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();

const MINT_ADDRESS = new PublicKey(process.env.MINT_ADDRESS!);
const PAYER_KEYPAIR = Keypair.fromSecretKey(
  bs58.decode(process.env.PAYER_KEYPAIR!)
);

(async () => {
  try {
    /// Localnet, expects `light test-validator` to be running:
    const connection: Rpc = createRpc();
    const mintAddress = MINT_ADDRESS;
    const payer = PAYER_KEYPAIR;

    const amount = bn(111); // each recipient will receive 111 tokens
    const recipients = [PAYER_KEYPAIR.publicKey].map(
      (address) => new PublicKey(address)
    );
    const activeStateTrees = await connection.getStateTreeInfos();

    /// Pick a new tree for each transaction!
    const treeInfo = selectStateTreeInfo(activeStateTrees);

    // Create an SPL token account for the sender.
    // The sender will send tokens from this account to the recipients as compressed tokens.
    const sourceTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      payer.publicKey
    );

    // Airdrop to example recipients addresses
    // 1 recipient = 120_000 CU
    // 5 recipients = 170_000 CU
    // with idempotent cPDA = +250_000 CU
    const instructions: web3.TransactionInstruction[] = [];
    instructions.push(
      web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 370_000 }),
      web3.ComputeBudgetProgram.setComputeUnitPrice({
        // Replace this with a dynamic priority_fee to land during high network load.
        microLamports: calculateComputeUnitPrice(20_000, 370_000),
      })
    );

    const compressInstruction = await CompressedTokenProgram.compress({
      payer: payer.publicKey,
      owner: payer.publicKey,
      source: sourceTokenAccount.address,
      toAddress: recipients,
      amount: recipients.map(() => amount),
      mint: mintAddress,
      outputStateTreeInfo: treeInfo,
      tokenPoolInfo: selectTokenPoolInfo(
        await getTokenPoolInfos(connection, mintAddress)
      ),
    });
    instructions.push(compressInstruction);

    // Sign the transaction with the payer and owner keypair
    const owner = payer;
    const additionalSigners = dedupeSigner(payer, [owner]);

    const { blockhash } = await connection.getLatestBlockhash();

    const tx = buildAndSignTx(
      instructions,
      payer,
      blockhash,
      additionalSigners
    );

    const txId = await sendAndConfirmTx(connection, tx);
    console.log(`txId: ${txId}`);
  } catch (e) {
    console.error(`Compression failed:`, e);
  }
})();
