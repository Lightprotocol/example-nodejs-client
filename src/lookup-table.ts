import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { createTokenProgramLookupTable } from "@lightprotocol/compressed-token";
import { Keypair } from "@solana/web3.js";
import { RPC_ENDPOINT } from "./constants";

/// Localnet, expects `light test-validator` to be running:
// const connection: Rpc = createRpc();

const payer = Keypair.generate();
/// Uncomment to use Testnet:
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

const main = async () => {
  /// airdrop lamports to pay fees
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, 1e7)
  );

  /// Create LUT
  const { address } = await createTokenProgramLookupTable(
    connection,
    payer,
    payer
  );

  console.log("Created lookup table:", address.toBase58());
};

main();
