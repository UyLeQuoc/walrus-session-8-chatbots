import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COPIED_FOR_MS = 1000;

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(() => {
    if (copied) return;
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    void clipboard.writeText(value).then(
      () => {
        setCopied(true);
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          setCopied(false);
        }, COPIED_FOR_MS);
      },
      () => {
        setCopied(false);
      },
    );
  }, [copied, value]);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={copied}
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? <Check className="text-green-600 dark:text-green-500" /> : <Copy />}
    </Button>
  );
}
