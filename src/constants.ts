import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
export const PAYER_KEYPAIR = Keypair.fromSecretKey(
  bs58.decode(process.env.PAYER_KEYPAIR!)
);

export const MINT_ADDRESS = new PublicKey(process.env.MINT_ADDRESS!);

export const AUTHORITY_KEYPAIR = process.env.LUT_AUTHORITY_KEYPAIR
  ? Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.LUT_AUTHORITY_KEYPAIR))
    )
  : undefined;

export const BOB_KEYPAIR = process.env.BOB_KEYPAIR
  ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.BOB_KEYPAIR)))
  : undefined;

export const LUT_MAINNET_AUTHORITY_KEYPAIR = process.env.LUT_AUTHORITY_KEYPAIR
  ? Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.LUT_AUTHORITY_KEYPAIR))
    )
  : undefined;

export const LUT_DEVNET_AUTHORITY_KEYPAIR = process.env.LUT_DEVNET_AUTH_KEYPAIR
  ? Keypair.fromSecretKey(bs58.decode(process.env.LUT_DEVNET_AUTH_KEYPAIR))
  : undefined;

if (!RPC_ENDPOINT) throw new Error("Please set RPC_ENDPOINT in .env");
if (!PAYER_KEYPAIR)
  throw new Error("Please set PAYER_KEYPAIR as bs58 string in .env");
if (!MINT_ADDRESS) throw new Error("Please set MINT_ADDRESS in .env");

console.log("PAYER PUBLIC KEY:", PAYER_KEYPAIR.publicKey.toString());
