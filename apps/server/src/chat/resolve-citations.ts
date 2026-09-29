import { isMemoryType } from "@hippo/memory";
import { hiddenBlobs, type Person, portFor } from "../identity/persons.ts";
import { type Citation, type CitedFact, dropHidden, factsFromLookup } from "./citations.ts";
import { checkRate, noteCommand } from "./ratelimit.ts";

export interface CitationMessage {
  id: string;
  cites?: Citation[];
}

export type ResolvedCitations =
  | { ok: true; limited: false; messages: Array<{ id: string; recalled: CitedFact[] }> }
  | { ok: true; limited: true; message: string };

export async function resolveStoredCitations(
  person: Person,
  channel: string,
  messages: CitationMessage[],
): Promise<ResolvedCitations> {
  const hidden = await hiddenBlobs(person.id);
  const visible = messages
    .filter((message) => (message.cites?.length ?? 0) > 0)
    .map((message) => ({
      id: message.id,
      cites: dropHidden(message.cites ?? [], hidden),
    }));
  const pending = visible.some((message) => message.cites.length > 0);
  if (!pending) {
    return {
      ok: true,
      limited: false,
      messages: visible.map((message) => ({ id: message.id, recalled: [] })),
    };
  }
  const gate = await checkRate(person.id);
  if (!gate.allowed) return { ok: true, limited: true, message: gate.message };
  await noteCommand(person.id, channel);
  const port = await portFor(person, channel);
  const found = new Map<string, string>();
  let reached = true;
  const types = [...new Set(visible.flatMap((message) => message.cites.map((cite) => cite.type)))];
  for (const type of types) {
    try {
      const hits = await port.recall({
        query: isMemoryType(type) ? `[${type}]` : type,
        limit: 100,
        maxDistance: 2,
      });
      for (const hit of hits) {
        if (found.has(hit.blob_id)) continue;
        found.set(hit.blob_id, hit.parsed?.text ?? hit.text);
      }
    } catch (err) {
      reached = false;
      console.warn("[citations] recall failed", err instanceof Error ? err.message : err);
      break;
    }
  }
  if (!reached)
    return { ok: true, limited: true, message: "Walrus Memory could not be reached just now." };
  return {
    ok: true,
    limited: false,
    messages: visible.map((message) => ({
      id: message.id,
      recalled: factsFromLookup(message.cites, found),
    })),
  };
}
