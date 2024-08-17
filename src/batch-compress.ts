import bs58 from "bs58";
import * as web3 from "@solana/web3.js";
import { RPC_ENDPOINT, PAYER_KEYPAIR } from "./constants";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token";

import {
  bn,
  buildAndSignTx,
  createRpc,
  dedupeSigner,
  Rpc,
} from "@lightprotocol/stateless.js";
import * as splToken from "@solana/spl-token";

const connection = new web3.Connection(RPC_ENDPOINT!);

// Decode the serialised transaction
const decodedTransaction = bs58.decode(
  "2YFEqngbPVpQdDMqAXKbWu2N5brqUH911MPr8XoR7YepEp6Wx1MqYMuBbV5v8E2jbaXqYaZuNRA4ecA1em9RnxKRwrfoEbRoh2Ca6oXPdd1PLkF9c49vGACvJVJ1Amz2ks5JhNdkrixa96haudXS5k8wPb67MVSTfNsyYriBHwAeeaCwkSNm5stZvb7n9jR4jUhLuPiSsXWUrxpX3Htev87rEkK3Hwnb6zz5rdWkqSB635gQ7wcVbBj4q8vpy43Zp2TaFSeWHu1XbbH3ey5h3pMPv4rPth8mmEgC3H3VWCP6QXWAxvS3Eruo2BQGTUbA5z38AK9xvMktyix61jQR7waRSNWzBCpQD56aViqB9pyG9ugYwNLp2WndWUDRwWd8HfGXz1ADk7kcoxvpdknzVUe5K2BeSsAbtjS8CZ7bKhk3VHd2WMeFm2Pk773KEYt4FWSXwVzVMX15M7DhVsShYqRKidjtRgCzhfotH8u7L9sNW1biEPy39RdpZn5yzyhrhvesQgtcgZ3T9W5g7xea4Lomc18KJ7Jy35jks8KLErcetjNFaZX8zSsivc8Y2r8o8YsHVBankFoEAkMwt9A8Zq38gfgAQuR7A47vh7mFXRth3vhwGNKM38XGF5H3XmdvtZTbG2WmnNvKjD1V1Pt3jkKdxft89ojk3nNRSFRgJwP6wneYkQLm81yRTdmjLcTZiLwHuHYuV8QWtyvBZaCFi23i9YMKH2cF8njSYeJAUyVcjPFA84dvZ6m9PDnHbkX4ebvT8cWeLRHRjYoSM4Uy8SqY39GDgTgjk2ULDWv8Gc3kAyDTjKwgDtX5FXKeAWSJcbdPrW9h5MucnRubksV6sFJYprocwYVrtmfPsTavxW6Xn7WFdP9urYH72jYGdY8Esprm2DCYinbcxQySQVXEmt5Q42TW5g3uycg163yxXjkbThakV2sNYTEn5bQEdFTKwRuDQrReR7wpVU2ha9DNcuBiR1zCmAheLrf3ZKEJkBW6HPe4JqjeMVqg4PHeKQJDAqD6XC1WNPM9gwEQ3G4fujAUEc8grSAKRo23H1Yu7sYLw256kQJAS9zgDcpoSxzZPW4bWuLgKqvToukGdUTebvW966iChTECbuAYijZSQiiSSKyjc8njUu1siDhHU8DCodPmqoXQYoJCL2w1m3G3GxGP7LSnXLzCffTxSFKMuE4qeFQbjmmxsqDyXnbhgkL5o8"
);

// Deserialize the transaction
const tx = web3.VersionedTransaction.deserialize(decodedTransaction);

// Log the decompiled individual instructions
console.log("Decompiled instructions:");
tx.message.compiledInstructions.forEach((instruction, index) => {
  console.log(`Instruction ${index + 1}:`);
  console.log(`  Program ID: ${instruction.programIdIndex}`);
  console.log(`  Accounts: ${instruction.accountKeyIndexes}`);
  console.log(`  Data: ${instruction.data}`);
});

const ixdata = [
  163, 52, 200, 231, 140, 3, 69, 186, 56, 1, 0, 0, 0, 88, 95, 248, 203, 21, 57,
  205, 50, 177, 187, 81, 32, 189, 166, 222, 106, 26, 27, 232, 95, 7, 27, 145,
  136, 214, 234, 60, 183, 179, 139, 215, 12, 0, 0, 0, 0, 0, 6, 0, 0, 0, 228, 24,
  95, 67, 226, 128, 122, 116, 237, 49, 5, 188, 138, 213, 201, 175, 185, 205,
  165, 243, 181, 43, 235, 115, 105, 129, 109, 16, 135, 210, 145, 124, 0, 202,
  154, 59, 0, 0, 0, 0, 0, 0, 0, 237, 84, 103, 229, 56, 140, 145, 184, 21, 145,
  165, 197, 112, 151, 107, 79, 118, 160, 146, 26, 178, 44, 236, 245, 215, 226,
  91, 221, 187, 188, 78, 244, 0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 159, 153,
  204, 201, 136, 222, 87, 179, 126, 252, 188, 79, 223, 65, 111, 51, 123, 167,
  113, 176, 113, 3, 216, 25, 71, 245, 50, 140, 93, 241, 136, 171, 0, 202, 154,
  59, 0, 0, 0, 0, 0, 0, 0, 106, 206, 100, 185, 40, 85, 224, 187, 93, 63, 5, 224,
  128, 54, 168, 24, 176, 154, 56, 181, 100, 60, 29, 223, 251, 212, 5, 112, 212,
  184, 243, 245, 0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 204, 172, 95, 227, 17,
  238, 86, 190, 153, 189, 141, 227, 235, 58, 62, 217, 92, 161, 104, 144, 7, 172,
  221, 141, 177, 15, 140, 190, 236, 210, 148, 98, 0, 202, 154, 59, 0, 0, 0, 0,
  0, 0, 0, 85, 198, 248, 176, 239, 6, 138, 202, 222, 128, 56, 234, 212, 67, 190,
  113, 121, 130, 94, 45, 64, 225, 209, 188, 226, 177, 213, 190, 30, 122, 65,
  228, 0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 188, 160, 101, 1, 0, 0, 0,
  0, 0,
];
const decodedData = CompressedTokenProgram.program.coder.types.decode(
  "CompressedTokenInstructionDataTransfer",
  //   Buffer.from(ixdata.slice(8))
  Buffer.from(ixdata.reverse())
);
console.log("decodedData:", decodedData);

console.log("tx:", tx);
// Print the transaction size
console.log(`Transaction size: ${tx.serialize().length} bytes`);
(async () => {
  // Send the transaction
  try {
    console.log(`Transaction size: ${tx.serialize().length} bytes`);

    const simulate = await connection.simulateTransaction(tx);

    if (simulate.value.err) {
      console.error("Simulation failed", simulate);
    } else {
      console.log("Simulation successful", simulate.value.logs);
    }
    // const simulationResult = await connection.simulateTransaction(tx);
    // console.log(`Transaction simulation result:`, simulationResult);
    // const signature = await connection.sendRawTransaction(tx.serialize(), {
    //   skipPreflight: true,
    // });
    // console.log(`Transaction sent successfully`, signature);
  } catch (e) {
    console.error(`Transaction failed to send`, e);
  }
})();
