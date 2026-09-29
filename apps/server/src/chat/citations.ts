import { z } from "zod";

const citationSchema = z.object({
  blobId: z.string().min(1).max(200),
  type: z.string().min(1).max(40),
  distance: z.number().min(0).max(2),
});

export type Citation = z.infer<typeof citationSchema>;

const envelopeSchema = z.object({
  v: z.literal(1),
  text: z.string(),
  cites: z.array(citationSchema).max(20),
});

export function packTurnBody(text: string, cites: Citation[]): string {
  return JSON.stringify({ v: 1, text, cites });
}

export function unpackTurnBody(raw: string): { text: string; cites: Citation[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { text: raw, cites: [] };
  }
  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) return { text: raw, cites: [] };
  return { text: envelope.data.text, cites: envelope.data.cites };
}

export function dropHidden(cites: Citation[], hidden: ReadonlySet<string>): Citation[] {
  return cites.filter((cite) => !hidden.has(cite.blobId));
}

export function relevanceOf(distance: number): number {
  return Number((1 - distance).toFixed(2));
}

export interface CitedFact {
  type: string;
  text: string;
  relevance: number;
  blobId: string;
}

export function factsFromLookup(
  cites: Citation[],
  found: ReadonlyMap<string, string>,
): CitedFact[] {
  const out: CitedFact[] = [];
  for (const cite of cites) {
    const text = found.get(cite.blobId);
    if (!text) continue;
    out.push({
      type: cite.type,
      text,
      relevance: relevanceOf(cite.distance),
      blobId: cite.blobId,
    });
  }
  return out;
}

export function citationsOf(
  injected: Array<{ blob_id: string; distance: number; parsed?: { type?: string } | null }>,
): Citation[] {
  const out: Citation[] = [];
  for (const item of injected) {
    const parsed = citationSchema.safeParse({
      blobId: item.blob_id,
      type: item.parsed?.type ?? "memory",
      distance: item.distance,
    });
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
