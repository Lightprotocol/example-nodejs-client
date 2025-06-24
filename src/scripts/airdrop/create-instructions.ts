import {
  CompressedTokenProgram,
  selectTokenPoolInfo,
  TokenPoolInfo,
} from "@lightprotocol/compressed-token";
import {
  bn,
  ActiveTreeBundle,
  pickRandomTreeAndQueue,
  selectStateTreeInfo,
  StateTreeInfo,
} from "@lightprotocol/stateless.js";
import {
  ComputeBudgetProgram,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";

interface CreateAirdropInstructionsParams {
  amount: number | bigint;
  recipients: PublicKey[];
  payer: PublicKey;
  sourceTokenAccount: PublicKey;
  mint: PublicKey;
  stateTreeInfos: StateTreeInfo[];
  tokenPoolInfos: TokenPoolInfo[];
  maxRecipientsPerInstruction?: number;
  maxInstructionsPerTransaction?: number;
  computeUnitLimit?: number;
  computeUnitPrice?: number | undefined;
}

export type InstructionBatch = TransactionInstruction[];

export async function createAirdropInstructions({
  amount,
  recipients,
  payer,
  sourceTokenAccount,
  mint,
  stateTreeInfos,
  tokenPoolInfos,
  maxRecipientsPerInstruction = 5,
  maxInstructionsPerTransaction = 3,
  computeUnitLimit = 500_000,
  computeUnitPrice = undefined,
}: CreateAirdropInstructionsParams): Promise<InstructionBatch[]> {
  const instructionBatches: InstructionBatch[] = [];
  const amountBn = bn(amount.toString());

  // Process recipients in chunks
  for (
    let i = 0;
    i < recipients.length;
    i += maxRecipientsPerInstruction * maxInstructionsPerTransaction
  ) {
    const instructions: TransactionInstruction[] = [];

    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
    );
    if (computeUnitPrice) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: computeUnitPrice,
        })
      );
    }

    const treeInfo = selectStateTreeInfo(stateTreeInfos);
    const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

    for (let j = 0; j < maxInstructionsPerTransaction; j++) {
      const startIdx = i + j * maxRecipientsPerInstruction;
      const recipientBatch = recipients.slice(
        startIdx,
        startIdx + maxRecipientsPerInstruction
      );

      if (recipientBatch.length === 0) break;

      const compressIx = await CompressedTokenProgram.compress({
        payer,
        owner: payer,
        source: sourceTokenAccount,
        toAddress: recipientBatch,
        amount: recipientBatch.map(() => amountBn),
        mint,
        outputStateTreeInfo: treeInfo,
        tokenPoolInfo,
      });

      instructions.push(compressIx);
    }

    if (
      (computeUnitPrice && instructions.length > 2) ||
      (!computeUnitPrice && instructions.length > 1)
    ) {
      instructionBatches.push(instructions);
    }
  }

  return instructionBatches;
}
