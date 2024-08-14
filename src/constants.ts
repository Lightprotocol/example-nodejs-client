import dotenv from "dotenv";
dotenv.config();

export const RPC_ENDPOINT = process.env.RPC_ENDPOINT;

if (!RPC_ENDPOINT) throw new Error("Please set RPC_ENDPOINT in .env");
