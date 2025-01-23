import {
    bn,
    compress,
    createRpc,
    pickRandomTreeAndQueue,
    transfer,
} from "@lightprotocol/stateless.js";
import {
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
import * as fs from 'fs';
import * as path from 'path';

const fromKeypair = PAYER_KEYPAIR;
const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);

const batchSize = 15;
const INITIAL_SOL_PER_KEYPAIR = 0.04;
const MIN_SOL_PER_KEYPAIR = 0.02;
const COMPRESS_LAMPORTS = bn(1e5);
const COMPRESSED_TRANSFER_AMOUNT = 1;
const ITERATIONS = 1000; // Number of iterations to run
const KEYPAIRS_DIR = './keypairs';

async function loadOrCreateKeypairs(): Promise<Keypair[]> {
    if (!fs.existsSync(KEYPAIRS_DIR)) {
        fs.mkdirSync(KEYPAIRS_DIR);
    }

    const keypairs: Keypair[] = [];

    for (let i = 0; i < batchSize; i++) {
        const keypairPath = path.join(KEYPAIRS_DIR, `keypair_${i}.json`);

        if (fs.existsSync(keypairPath)) {
            const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
            keypairs.push(Keypair.fromSecretKey(secretKey));
            console.log(`Loaded keypair ${i} from file`);
        } else {
            const keypair = Keypair.generate();
            fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
            keypairs.push(keypair);
            console.log(`Generated and saved new keypair ${i}`);
        }
    }

    return keypairs;
}

async function returnFundsToMain(keypair: Keypair): Promise<void> {
    const balance = await connection.getBalance(keypair.publicKey);
    if (balance > 0) {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: fromKeypair.publicKey,
                lamports: balance - 5000,
            }),
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair],
        );
        console.log(
            `Returned ${balance / LAMPORTS_PER_SOL} SOL from ${keypair.publicKey.toBase58()} ` +
            `to main wallet. Tx: ${signature}`,
        );
    }
}

(async () => {
    try {
        // 1. Load or create keypairs
        const newKeypairs = await loadOrCreateKeypairs();

        // 2. Fund new keypairs if needed
        for (let i = 0; i < batchSize; i++) {
            const balance = await connection.getBalance(newKeypairs[i].publicKey);
            if (balance < INITIAL_SOL_PER_KEYPAIR * LAMPORTS_PER_SOL) {
                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: fromKeypair.publicKey,
                        toPubkey: newKeypairs[i].publicKey,
                        lamports: Math.floor(INITIAL_SOL_PER_KEYPAIR * LAMPORTS_PER_SOL) - balance,
                    }),
                );
                const txSignature = await sendAndConfirmTransaction(
                    connection,
                    transaction,
                    [fromKeypair],
                );
                console.log(
                    `Topped up ${newKeypairs[i].publicKey.toBase58()} to ${INITIAL_SOL_PER_KEYPAIR} SOL. ` +
                    `Tx: ${txSignature}`,
                );
            }
        }

        // 3. Main loop with N iterations
        for (let iteration = 0; iteration < ITERATIONS; iteration++) {
            console.log(`${iteration + 1}/${ITERATIONS}`);

            const activeStateTrees = await connection.getCachedActiveStateTreeInfo();
            const { tree } = pickRandomTreeAndQueue(activeStateTrees);

            const compressAndTransferPromises = newKeypairs.map(
                async (senderKp, i) => {
                    const balance = await connection.getBalance(senderKp.publicKey);
                    const thresholdLamports = MIN_SOL_PER_KEYPAIR * LAMPORTS_PER_SOL;

                    if (balance < thresholdLamports) {
                        const topUpLamports = thresholdLamports - balance;
                        const topUpTx = new Transaction().add(
                            SystemProgram.transfer({
                                fromPubkey: fromKeypair.publicKey,
                                toPubkey: senderKp.publicKey,
                                lamports: topUpLamports,
                            }),
                        );
                        await sendAndConfirmTransaction(connection, topUpTx, [fromKeypair]);
                    }

                    const compressTxId = await compress(
                        connection,
                        senderKp,
                        COMPRESS_LAMPORTS,
                        senderKp.publicKey,
                        tree,
                    );
                    console.log(`Compressed ${COMPRESS_LAMPORTS} lamports for ${senderKp.publicKey.toBase58()}. Tx: ${compressTxId}`);

                    const recipientIndex = (i + 1) % batchSize;
                    const recipientPubkey = newKeypairs[recipientIndex].publicKey;

                    await transfer(
                        connection,
                        senderKp,
                        COMPRESSED_TRANSFER_AMOUNT,
                        senderKp,
                        recipientPubkey,
                        tree,
                        { skipPreflight: false },
                    );
                    console.log(`Transferred ${COMPRESSED_TRANSFER_AMOUNT} SOL from ${senderKp.publicKey.toBase58()} to ${recipientPubkey.toBase58()}`);
                },
            );

            await Promise.all(compressAndTransferPromises);
        }

        // 4. Return remaining funds to main wallet
        console.log('\nReturning remaining funds to main wallet...');
        for (const keypair of newKeypairs) {
            await returnFundsToMain(keypair);
        }

    } catch (error) {
        console.error("An error occurred:", error);
    }
})();