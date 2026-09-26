import { Button } from "@/components/ui/button";
import { Section } from "@/features/me/section";
import { useExport } from "@/features/me/use-export";

export function ExportPanel({ onError }: { onError: (message: string) => void }) {
  const { busy, coverage, download } = useExport(onError);

  return (
    <Section title="Export">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy !== null} onClick={() => void download("md")}>
          {busy === "md" ? "Reading from Walrus…" : "Download to read (.md)"}
        </Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => void download("json")}>
          {busy === "json" ? "Reading from Walrus…" : "Download the full record (.json)"}
        </Button>
      </div>
      {coverage && (
        <p className="text-sm text-muted-foreground">
          {coverage.memories} memories, text for {coverage.withText}, verified for{" "}
          <span className="font-medium text-foreground">{coverage.verified}</span>.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        What it cannot do yet: let you decrypt the blobs without hippo.
      </p>
    </Section>
  );
}
