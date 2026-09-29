import { type CommandTable, sanitizeTable } from "@hippo/core/command-table";

export interface StoredCitation {
  blobId: string;
  type: string;
  distance: number;
}

export interface StoredMessage {
  id: string;
  role: string;
  kind: string;
  text: string;
  table?: unknown;
  cites?: unknown;
  recalled?: unknown;
}

export interface UiCitation {
  type: string;
  text: string;
  relevance: number;
  blobId: string;
}

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
  metadata?: {
    command?: true;
    table?: CommandTable;
    cites?: StoredCitation[];
    recalled?: UiCitation[];
  };
}

export function isStoredMessage(value: unknown): value is StoredMessage {
  if (!value || typeof value !== "object") return false;
  const row = value as { id?: unknown; role?: unknown; kind?: unknown; text?: unknown };
  return (
    typeof row.id === "string" &&
    (row.role === "user" || row.role === "assistant") &&
    (row.kind === "turn" || row.kind === "command") &&
    typeof row.text === "string"
  );
}

function citesOf(value: unknown): StoredCitation[] {
  if (!Array.isArray(value)) return [];
  const out: StoredCitation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { blobId?: unknown; type?: unknown; distance?: unknown };
    if (
      typeof row.blobId !== "string" ||
      typeof row.type !== "string" ||
      typeof row.distance !== "number"
    ) {
      continue;
    }
    out.push({ blobId: row.blobId, type: row.type, distance: row.distance });
  }
  return out;
}

function recalledOf(value: unknown): UiCitation[] {
  if (!Array.isArray(value)) return [];
  const out: UiCitation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { type?: unknown; text?: unknown; relevance?: unknown; blobId?: unknown };
    if (
      typeof row.type !== "string" ||
      typeof row.text !== "string" ||
      typeof row.relevance !== "number" ||
      typeof row.blobId !== "string"
    ) {
      continue;
    }
    out.push({ type: row.type, text: row.text, relevance: row.relevance, blobId: row.blobId });
  }
  return out;
}

export function toUiMessages(rows: unknown[]): UiMessage[] {
  const out: UiMessage[] = [];
  for (const row of rows) {
    if (!isStoredMessage(row)) continue;
    const table = row.role === "assistant" ? sanitizeTable(row.table) : undefined;
    const cites = citesOf(row.cites);
    const recalled = recalledOf(row.recalled);
    const metadata: NonNullable<UiMessage["metadata"]> = {
      ...(row.kind === "command" ? { command: true as const } : {}),
      ...(table ? { table } : {}),
      ...(cites.length > 0 ? { cites } : {}),
      ...(recalled.length > 0 ? { recalled } : {}),
    };
    out.push({
      id: row.id,
      role: row.role as UiMessage["role"],
      parts: [{ type: "text", text: row.text }],
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    });
  }
  return out;
}

export function applyResolved(
  messages: UiMessage[],
  resolved: Array<{ id: string; recalled: UiCitation[] }>,
): UiMessage[] {
  const byId = new Map(resolved.map((item) => [item.id, item.recalled]));
  return messages.map((message) => {
    if (!byId.has(message.id)) return message;
    const recalled = byId.get(message.id) ?? [];
    const metadata: NonNullable<UiMessage["metadata"]> = { ...(message.metadata ?? {}) };
    delete metadata.cites;
    if (recalled.length > 0) metadata.recalled = recalled;
    else delete metadata.recalled;
    if (Object.keys(metadata).length === 0) {
      return { id: message.id, role: message.role, parts: message.parts };
    }
    return { ...message, metadata };
  });
}

export function resolvedFrom(
  body: unknown,
): { limited: boolean; messages: Array<{ id: string; recalled: UiCitation[] }> } | null {
  if (!body || typeof body !== "object") return null;
  const row = body as { limited?: unknown; messages?: unknown };
  if (row.limited === true) return { limited: true, messages: [] };
  if (!Array.isArray(row.messages)) return null;
  const messages = row.messages.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const message = item as { id?: unknown; recalled?: unknown };
    if (typeof message.id !== "string") return [];
    return [{ id: message.id, recalled: recalledOf(message.recalled) }];
  });
  return { limited: false, messages };
}
