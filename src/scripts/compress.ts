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
  pickRandomTreeAndQueue,
  Rpc,
  selectStateTreeInfo,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();

const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const MINT_ADDRESS = new PublicKey(process.env.MINT_ADDRESS!);
const PAYER_KEYPAIR = Keypair.fromSecretKey(
  bs58.decode(process.env.PAYER_KEYPAIR!)
);

(async () => {
  try {
    const connection: Rpc = createRpc(RPC_ENDPOINT);
    const mintAddress = MINT_ADDRESS;
    const payer = PAYER_KEYPAIR;

    const amount = bn(333); // each recipient will receive 111 tokens
    const recipients = ["GMPWaPPrCeZPse5kwSR3WUrqYAPrVZBSVwymqh7auNW7"].map(
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

    const instructions: web3.TransactionInstruction[] = [];

    instructions.push(
      web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
      web3.ComputeBudgetProgram.setComputeUnitPrice({
        // ideally replace this with a dynamic priority_fee based on network conditions.
        microLamports: calculateComputeUnitPrice(20_000, 120_000),
      })
    );

    const compressInstruction = await CompressedTokenProgram.compress({
      payer: payer.publicKey,
      owner: payer.publicKey,
      source: sourceTokenAccount.address, // here, the owner of this account is also the payer.
      toAddress: recipients,
      amount: recipients.map(() => amount),
      mint: mintAddress,
      outputStateTreeInfo: treeInfo,
      tokenPoolInfo: selectTokenPoolInfo(
        await getTokenPoolInfos(connection, mintAddress)
      ),
    });
    instructions.push(compressInstruction);

    // Use zk-compression LUT for your network
    // https://www.zkcompression.com/developers/protocol-addresses-and-urls#lookup-tables
    const lookupTableAddress = new web3.PublicKey(
      "9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ" // mainnet
      // "qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V" // devnet
    );

    // Get the lookup table account state
    const lookupTableAccount = (
      await connection.getAddressLookupTable(lookupTableAddress)
    ).value!;

    // Sign the transaction with the payer and owner keypair
    const owner = payer;
    const additionalSigners = dedupeSigner(payer, [owner]);

    const { blockhash } = await connection.getLatestBlockhash();

    const tx = buildAndSignTx(
      instructions,
      payer,
      blockhash,
      additionalSigners,
      [lookupTableAccount]
    );

    // Uncomment to send the transaction.
    const txId = await sendAndConfirmTx(connection, tx);
    console.log(`txId: ${txId}`);
  } catch (e) {
    console.error(`Compression failed:`, e);
  }
})();
