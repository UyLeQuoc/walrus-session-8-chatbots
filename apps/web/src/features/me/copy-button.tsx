import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  subtle,
}: {
  value: string;
  label?: string;
  subtle?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = useCallback(() => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, [value]);

  return (
    <Button
      type="button"
      variant={copied ? "default" : "ghost"}
      onClick={copy}
      aria-label={label ? `Copy ${label}` : "Copy"}
      className={cn(
        subtle && !copied && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
      )}
    >
      {copied ? "copied" : "copy"}
    </Button>
  );
}
