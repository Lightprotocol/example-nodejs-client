import {
  Rpc,
  createRpc,
  createStateTreeLookupTable,
  extendStateTreeLookupTable,
} from "@lightprotocol/stateless.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT, AUTHORITY_KEYPAIR } from "../constants";
import { PublicKey } from "@solana/web3.js";

const payer = PAYER_KEYPAIR;
const connection: Rpc = createRpc(RPC_ENDPOINT);

const stateTreeAddresses = [
  "smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT",
  "smt2rJAFdyJJupwMKAqTNAJwvjhmiZ4JYGZmbVRw1Ho",
  "smt3AFtReRGVcrP11D6bSLEaKdUmrGfaTNowMVccJeu",
  "smt4vjXvdjDFzvRMUxwTWnSy4c7cKkMaHuPrGsdDH7V",
  "smt5uPaQT9n6b1qAkgyonmzRxtuazA53Rddwntqistc",
  "smt6ukQDSPPYHSshQovmiRUjG9jGFq2hW9vgrDFk5Yz",
  "smt7onMFkvi3RbyhQCMajudYQkB1afAFt9CDXBQTLz6",
  "smt8TYxNy8SuhAdKJ8CeLtDkr2w6dgDmdz5ruiDw9Y9",
  "smt9ReAYRF5eFjTd5gBJMn5aKwNRcmp3ub2CQr2vW7j",
  "smtAvYA5UbTRyKAkAj5kHs1CmrA42t6WkVLi4c6mA1f",
].map((address) => new PublicKey(address));

const queueAddresses = [
  "nfq1NvQDJ2GEgnS8zt9prAe8rjjpAW1zFkrvZoBR148",
  "nfq2hgS7NYemXsFaFUCe3EMXSDSfnZnAe27jC6aPP1X",
  "nfq3de4qt9d3wHxXWy1wcge3EXhid25mCr12bNWFdtV",
  "nfq4Ncp1vk3mFnCQ9cvwidp9k2L6fxEyCo2nerYD25A",
  "nfq5b5xEguPtdD6uPetZduyrB5EUqad7gcUE46rALau",
  "nfq6uzaNZ5n3EWF4t64M93AWzLGt5dXTikEA9fFRktv",
  "nfq7yytdKkkLabu1KpvLsa5VPkvCT4jPWus5Yi74HTH",
  "nfq8vExDykci3VUSpj9R1totVst87hJfFWevNK4hiFb",
  "nfq9KFpNQL45ppP6ZG7zBpUeN18LZrNGkKyvV1kjTX2",
  "nfqAroCRkcZBgsAJDNkptKpsSWyM6cgB9XpWNNiCEC4",
].map((address) => new PublicKey(address));

const cpis = [
  "cpi1uHzrEhBG733DoEJNgHCyRS3XmmyVNZx5fonubE4",
  "cpi2cdhkH5roePvcudTgUL8ppEBfTay1desGh8G8QxK",
  "cpi3Ycq5qZzFEwZSWgwMhMi1M9KG4KVx4T9GUmb58gk",
  "cpi4yJqDt4SjPXaxKkvhXRowqiFxv1jKgoq6jDMfc2c",
  "cpi5ryT8ULH2aLs8u1V6vG1uA71d52tRqHrDUxiVn8A",
  "cpi6maYjfu2TGbRu4dzsjzs4BHDGKdTyy4bhPNCmRmV",
  "cpi7qnzKBpzhzVfGXyaabXyhGJVTaNQSKh4x4jffLLa",
  "cpi8GBR819DvLLWmiVgYmjLAhYX6j9bnBXaYXCHEA7i",
  "cpi9CEV5DdCA5pyizmqv2Tk2aFBFwD32WSv6qaSN4Vb",
  "cpiAb2eNFf6MQeqMWEyEjSN3VJcD5hghujhmtdcMuZp",
].map((cpi) => new PublicKey(cpi));

(async () => {
  const data = await createStateTreeLookupTable({
    connection,
    payer,
    authority: AUTHORITY_KEYPAIR!,
    recentSlot: await connection.getSlot(),
  });

  await extendStateTreeLookupTable({
    connection,
    tableAddress: data.address,
    newStateTreeAddresses: stateTreeAddresses.slice(
      0,
      stateTreeAddresses.length / 2
    ),
    newQueueAddresses: queueAddresses.slice(0, queueAddresses.length / 2),
    newCpiContextAddresses: cpis.slice(0, cpis.length / 2),
    payer,
    authority: AUTHORITY_KEYPAIR!,
  });

  await extendStateTreeLookupTable({
    connection,
    tableAddress: new PublicKey("7i86eQs3GSqHjN47WdWLTCGMW6gde1q96G2EVnUyK2st"),
    newStateTreeAddresses: stateTreeAddresses.slice(
      stateTreeAddresses.length / 2
    ),
    newQueueAddresses: queueAddresses.slice(queueAddresses.length / 2),
    newCpiContextAddresses: cpis.slice(cpis.length / 2),
    payer,
    authority: AUTHORITY_KEYPAIR!,
  });
})();
