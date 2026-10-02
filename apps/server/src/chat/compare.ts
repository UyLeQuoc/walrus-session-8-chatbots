import { completeTurn, type TurnInput } from "@hippo/core";

export type CompareInput = Pick<
  TurnInput,
  "model" | "port" | "messages" | "channel" | "userHandle" | "abortSignal"
>;

export function memoryOffTurn(input: CompareInput): TurnInput {
  return { ...input, memoryEnabled: false };
}

export async function answerWithoutMemory(input: CompareInput): Promise<string> {
  return (await completeTurn(memoryOffTurn(input))).text;
}
