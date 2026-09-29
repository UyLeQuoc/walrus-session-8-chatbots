import { useEffect, useState } from "react";
import type { RememberedCard } from "@/features/chat/remembered";
import { cardsFromStored } from "@/features/chat/stored-memories";
import { apiFetch } from "@/lib/api";

export function useChatMemories(conversationId: string | null): {
  cards: RememberedCard[];
  loading: boolean;
  error: string;
} {
  const [state, setState] = useState<{
    id: string;
    cards: RememberedCard[];
    loading: boolean;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setState({ id: conversationId, cards: [], loading: true, error: "" });
    void (async () => {
      try {
        const res = await apiFetch(`/api/conversations/${conversationId}/memories`);
        if (cancelled) return;
        if (!res.ok) {
          setState({
            id: conversationId,
            cards: [],
            loading: false,
            error: "Could not load what this chat remembered.",
          });
          return;
        }
        const body: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        const limited =
          body && typeof body === "object" && (body as { limited?: unknown }).limited === true;
        setState({
          id: conversationId,
          cards: cardsFromStored(body, Date.now()),
          loading: false,
          error: limited ? "Could not read every fact back from Walrus just now." : "",
        });
      } catch {
        if (cancelled) return;
        setState({
          id: conversationId,
          cards: [],
          loading: false,
          error: "Could not load what this chat remembered.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (!conversationId) return { cards: [], loading: false, error: "" };
  if (!state || state.id !== conversationId) return { cards: [], loading: true, error: "" };
  return { cards: state.cards, loading: state.loading, error: state.error };
}
