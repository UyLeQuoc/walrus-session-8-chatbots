export interface StoredMessage {
  id: string;
  role: string;
  kind: string;
  text: string;
}

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
  metadata?: { command: true };
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

export function toUiMessages(rows: unknown[]): UiMessage[] {
  const out: UiMessage[] = [];
  for (const row of rows) {
    if (!isStoredMessage(row)) continue;
    out.push({
      id: row.id,
      role: row.role as UiMessage["role"],
      parts: [{ type: "text", text: row.text }],
      ...(row.kind === "command" ? { metadata: { command: true } } : {}),
    });
  }
  return out;
}
