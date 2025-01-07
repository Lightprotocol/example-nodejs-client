import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
export const PAYER_KEYPAIR = Keypair.fromSecretKey(
  bs58.decode(process.env.PAYER_KEYPAIR!)
);
export const MINT_ADDRESS = new PublicKey(process.env.MINT_ADDRESS!);
if (!RPC_ENDPOINT) throw new Error("Please set RPC_ENDPOINT in .env");
if (!PAYER_KEYPAIR)
  throw new Error("Please set PAYER_KEYPAIR as bs58 string in .env");
if (!MINT_ADDRESS) throw new Error("Please set MINT_ADDRESS in .env");

console.log("PAYER_KEYPAIR", PAYER_KEYPAIR.publicKey.toString());
