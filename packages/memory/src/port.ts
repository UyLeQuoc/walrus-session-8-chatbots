/**
 * MemoryPort is what the agent core talks to. It hides guest vs owned,
 * namespaces, dedupe, rate limiting and text formatting, so channel adapters
 * and the LLM loop never touch MemWal directly.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { createClient, type MemoryScope } from "./client.ts";
import { buildMemoryText, type MemoryType } from "./format.ts";
import { limiterFor } from "./limiter.ts";
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

/** What the LLM sees. Deliberately small and free of internal ids. */
export interface RememberResult extends Record<string, unknown> {
  saved: boolean;
  note: string;
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
  /** Resolves once every background write started by this port has settled. */
  flush(): Promise<void>;
}

export interface WriteEvent {
  scope: MemoryScope;
  type: MemoryType;
  /** Present once the blob exists, or for a duplicate (the blob it matched). */
  blobId: string | null;
  jobId: string | null;
  textSha256: string;
  channel: string;
  /**
   * `accepted` fires immediately and should be persisted straight away: a
   * deploy during the ~25 s write window must not lose a memory the user was
   * already told about. `stored` or `failed` follows for the same job id.
   */
  outcome: "accepted" | "stored" | "failed" | "duplicate";
  error?: string;
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
  const limiter = limiterFor(scope.key);
  const pending = new Set<Promise<unknown>>();

  const track = (p: Promise<unknown>) => {
    pending.add(p);
    void p.finally(() => pending.delete(p));
  };

  return {
    scope,

    async remember(input) {
      const { text, removed } = redactCredentials(input.text);
      const line = buildMemoryText({ type: input.type, by, channel: input.channel, text });
      const sha = bytesToHex(sha256(new TextEncoder().encode(line)));
      const outcome = await rememberWithDedupe(client, {
        text: line,
        namespace: scope.namespace,
        limiter,
      });

      if (outcome.status === "duplicate") {
        await onWrite?.({
          scope,
          type: input.type,
          blobId: outcome.blobId,
          jobId: null,
          textSha256: sha,
          channel,
          outcome: "duplicate",
        });
        return {
          saved: false,
          note: "Already in memory, nothing written. Do not tell the user it was saved again.",
          redacted: removed,
        };
      }

      // Record the accepted job now, so the memory survives a restart or deploy
      // during the write window rather than vanishing after the user was told
      // it was saved.
      await onWrite?.({
        scope,
        type: input.type,
        blobId: null,
        jobId: outcome.jobId,
        textSha256: sha,
        channel,
        outcome: "accepted",
      });

      // The blob id arrives ~25 s later; fill it in then.
      track(
        outcome.settled.then(async (s) => {
          if (s.status !== "stored" || !s.blobId) {
            console.error(
              `[memory] write failed in ${scope.namespace}: ${s.error ?? "no blob id"}`,
            );
          }
          await onWrite?.({
            scope,
            type: input.type,
            blobId: s.blobId,
            jobId: outcome.jobId,
            textSha256: sha,
            channel,
            outcome: s.status,
            error: s.error,
          });
        }),
      );

      return {
        saved: true,
        note: `Stored as ${input.type}. It is being written to Walrus now and is recallable within about a minute.`,
        redacted: removed,
      };
    },

    recall(input) {
      return recallRelevant(client, { ...input, namespace: scope.namespace, limiter });
    },

    async flush() {
      await Promise.allSettled([...pending]);
    },
  };
}
