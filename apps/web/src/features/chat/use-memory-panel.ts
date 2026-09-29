import { useCallback, useState } from "react";
import { type PanelChoice, panelOpen, parsePanelChoice } from "@/features/chat/memory-panel-state";
import { useIsMobile } from "@/hooks/use-mobile";

const KEY = "hippo.memory-panel";

function readChoice(): PanelChoice | null {
  try {
    return parsePanelChoice(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function writeChoice(open: boolean): void {
  try {
    localStorage.setItem(KEY, open ? "open" : "closed");
  } catch {
    // The panel still moves. The choice will not survive a reload.
  }
}

export function useMemoryPanel() {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(() => panelOpen(readChoice()));
  const close = useCallback(() => {
    writeChoice(false);
    setOpen(false);
  }, []);
  const show = useCallback(() => {
    writeChoice(true);
    setOpen(true);
  }, []);
  return { open, mobile, close, show };
}
