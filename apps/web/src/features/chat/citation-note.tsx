import { Button } from "@/components/ui/button";

export function CitationNote({ note, onRetry }: { note: string; onRetry: (() => void) | null }) {
  if (!note) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2" role="status">
      <p className="text-sm text-muted-foreground">{note}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
