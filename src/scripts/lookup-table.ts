import {
  Rpc,
  buildAndSignTx,
  confirmTx,
  createRpc,
  dedupeSigner,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import { createTokenProgramLookupTable } from "@lightprotocol/compressed-token";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import { AddressLookupTableProgram, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
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

  // await extend(payer, payer, address);
})();

async function extend(
  payer: Keypair,
  authority: Keypair,
  lookupTableAddress: PublicKey,
  tokenProgramId: PublicKey = TOKEN_PROGRAM_ID
) {
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    authority: authority.publicKey,
    lookupTable: lookupTableAddress,
    addresses: [tokenProgramId],
  });
  const bhash = await connection.getLatestBlockhash();
  const tx = await buildAndSignTx(
    [extendInstruction],
    authority,
    bhash.blockhash,
    dedupeSigner(payer, [authority])
  );
  await sendAndConfirmTx(connection, tx);

  console.log("extended lookup table:", lookupTableAddress.toBase58());
}
