/**
 * Copy, with the one thing a copy button must do: tell you it worked.
 *
 * The Claude Code steps on /me are the only thing on the page a reader is meant
 * to run, and until now they had to be selected by hand.
 */
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  subtle,
}: {
  value: string;
  label?: string;
  /**
   * Hide until the row is hovered or the button is focused.
   *
   * A list of six delegate keys and five memories put fifteen "copy" chips on
   * one page, all competing with the content they belong to. Keyboard users
   * still reach it: opacity does not remove it from the tab order, and focus
   * brings it back.
   */
  subtle?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = useCallback(() => {
    // Clipboard access is denied outright in some contexts, and a button that
    // silently does nothing is worse than one that says so.
    void navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? `Copy ${label}` : "Copy"}
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all",
        copied
          ? "border-transparent bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        subtle && !copied && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
      )}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
