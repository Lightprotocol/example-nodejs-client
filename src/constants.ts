import dotenv from "dotenv";
dotenv.config();

export const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${process.env.RPC_KEY}`;
