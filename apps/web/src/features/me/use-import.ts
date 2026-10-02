import { IMPORT_TYPES, type ImportedFact } from "@hippo/core/import-facts";
import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface CandidateFact extends ImportedFact {
  keep: boolean;
}

function factsOf(body: unknown): ImportedFact[] {
  const rows = body && typeof body === "object" ? (body as { facts?: unknown }).facts : null;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const { type, text } = row as { type?: unknown; text?: unknown };
    const known = IMPORT_TYPES.find((t) => t === type);
    return known && typeof text === "string" ? [{ type: known, text }] : [];
  });
}

async function errorOf(res: Response, fallback: string): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  const error = body && typeof body === "object" ? (body as { error?: unknown }).error : null;
  return typeof error === "string" ? error : fallback;
}

export function useImport(onSaved: () => void) {
  const [text, setText] = useState("");
  const [facts, setFacts] = useState<CandidateFact[]>([]);
  const [phase, setPhase] = useState<"idle" | "finding" | "saving">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const find = useCallback(async () => {
    setPhase("finding");
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/api/me/import/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setError(await errorOf(res, "Could not read that note just now."));
        return;
      }
      const found = factsOf(await res.json().catch(() => null));
      setFacts(found.map((fact) => ({ ...fact, keep: true })));
      if (found.length === 0) setMessage("No facts about you came out of that note.");
    } finally {
      setPhase("idle");
    }
  }, [text]);

  const toggle = useCallback((index: number) => {
    setFacts((current) =>
      current.map((fact, i) => (i === index ? { ...fact, keep: !fact.keep } : fact)),
    );
  }, []);

  const save = useCallback(async () => {
    const kept = facts
      .filter((fact) => fact.keep)
      .map(({ type, text: fact }) => ({ type, text: fact }));
    if (kept.length === 0) return;
    setPhase("saving");
    setError("");
    try {
      const res = await apiFetch("/api/me/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facts: kept }),
      });
      if (!res.ok) {
        setError(await errorOf(res, "Could not keep those facts just now."));
        return;
      }
      const body = (await res.json()) as { saved?: unknown; known?: unknown; failed?: unknown };
      const count = (value: unknown) => (typeof value === "number" ? value : 0);
      setMessage(
        `Kept ${count(body.saved)}. Already known: ${count(body.known)}. Could not keep: ${count(body.failed)}. Each lands on Walrus in about half a minute.`,
      );
      setFacts([]);
      setText("");
      onSaved();
    } finally {
      setPhase("idle");
    }
  }, [facts, onSaved]);

  return {
    text,
    setText,
    facts,
    toggle,
    find,
    save,
    finding: phase === "finding",
    saving: phase === "saving",
    message,
    error,
  };
}
