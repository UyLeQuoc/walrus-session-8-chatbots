/**
 * MemoryPort is what the agent core talks to. It hides guest/owned, namespaces,
 * dedupe and formatting, so channel adapters and the LLM loop never touch MemWal directly.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { createClient, type MemoryScope } from "./client.ts";
import { buildMemoryText, type MemoryType } from "./format.ts";
import {
  type RecalledMemory,
  type RememberOutcome,
  recallRelevant,
  rememberWithDedupe,
} from "./policy.ts";
import { redactCredentials } from "./redact.ts";

export interface RememberInput {
  type: MemoryType;
  text: string;
  channel?: string;
}
export interface RememberResult extends Record<string, unknown> {
  outcome: RememberOutcome["status"];
  blobId: string;
  stored: string;
  redacted: string[];
}
export interface RecallInput {
  query: string;
  limit?: number;
  maxDistance?: number;
}

export interface MemoryPort {
  readonly scope: MemoryScope;
  remember(input: RememberInput): Promise<RememberResult>;
  recall(input: RecallInput): Promise<RecalledMemory[]>;
}

export interface WriteEvent {
  scope: MemoryScope;
  type: MemoryType;
  blobId: string;
  textSha256: string;
  channel: string;
  outcome: RememberOutcome["status"];
}

export interface CreatePortOptions {
  scope: MemoryScope;
  /** Handle written into the [by:@handle] tag. */
  by: string;
  channel: string;
  onWrite?: (e: WriteEvent) => void | Promise<void>;
}

export function createMemoryPort({ scope, by, channel, onWrite }: CreatePortOptions): MemoryPort {
  const client = createClient(scope);
  return {
    scope,
    async remember(input) {
      const { text, removed } = redactCredentials(input.text);
      const line = buildMemoryText({ type: input.type, by, channel: input.channel, text });
      const outcome = await rememberWithDedupe(client, { text: line, namespace: scope.namespace });
      await onWrite?.({
        scope,
        type: input.type,
        blobId: outcome.blobId,
        textSha256: bytesToHex(sha256(new TextEncoder().encode(line))),
        channel,
        outcome: outcome.status,
      });
      return { outcome: outcome.status, blobId: outcome.blobId, stored: line, redacted: removed };
    },
    recall(input) {
      return recallRelevant(client, { ...input, namespace: scope.namespace });
    },
  };
}
