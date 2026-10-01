import { useCallback, useState } from "react";
import {
  type PanelChoice,
  panelOpen,
  panelShown,
  parsePanelChoice,
} from "@/features/chat/memory-panel-state";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const close = useCallback(() => {
    if (mobile) {
      setSheetOpen(false);
      return;
    }
    writeChoice(false);
    setOpen(false);
  }, [mobile]);
  const show = useCallback(() => {
    if (mobile) {
      setSheetOpen(true);
      return;
    }
    writeChoice(true);
    setOpen(true);
  }, [mobile]);
  return { open: panelShown(mobile, open, sheetOpen), mobile, close, show };
}
