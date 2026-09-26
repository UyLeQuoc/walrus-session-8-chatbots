import { useEffect, useState } from "react";
import { toUiMessages, type UiMessage } from "@/features/chat/transcript";
import { apiFetch } from "@/lib/api";

export function useTranscript(id: string | null) {
  const [generation, setGeneration] = useState(0);
  const [messages, setMessages] = useState<UiMessage[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setError("");
      const res = await apiFetch(`/api/conversations/${id}/messages`);
      if (cancelled) return;
      if (!res.ok) {
        setError("That chat is gone.");
        setMessages([]);
        setGeneration((n) => n + 1);
        return;
      }
      const body: unknown = await res.json().catch(() => null);
      if (cancelled) return;
      const rows = (body as { messages?: unknown } | null)?.messages;
      setMessages(Array.isArray(rows) ? toUiMessages(rows) : []);
      setError("");
      setGeneration((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { messages, error, generation };
}
