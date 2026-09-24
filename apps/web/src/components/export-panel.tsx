/**
 * Take the memory away as a file.
 *
 * The server builds it fresh on every request and keeps nothing: the text in it
 * comes back from Walrus and never touches Postgres. A plain link would not do,
 * because a cross-origin deployment identifies the person with headers, which a
 * link cannot send, so the file is fetched and handed to the browser instead.
 */
import { useState } from "react";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { API_URL, identityHeaders } from "@/lib/api";

type Format = "md" | "json";

interface Coverage {
  memories: number;
  withText: number;
  verified: number;
}

export function ExportPanel({ onError }: { onError: (message: string) => void }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  const download = async (format: Format) => {
    setBusy(format);
    try {
      const res = await fetch(`${API_URL}/api/me/export?format=${format}`, {
        credentials: "include",
        headers: identityHeaders(),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The export failed (${res.status}).`);
      }
      const content = await res.text();
      if (format === "json") {
        const parsed = JSON.parse(content) as { coverage?: Coverage };
        if (parsed.coverage) setCoverage(parsed.coverage);
      }
      const name =
        /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
        `hippo-memory.${format}`;
      const url = URL.createObjectURL(
        new Blob([content], { type: res.headers.get("content-type") ?? "" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "The export failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section
      title="Take it with you"
      description="Every memory hippo wrote for you, with its blob on Walrus. The text is checked against the fingerprint hippo recorded when it wrote it."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void download("md")}
        >
          {busy === "md" ? "Reading from Walrus…" : "Download to read (.md)"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void download("json")}
        >
          {busy === "json" ? "Reading from Walrus…" : "Download the full record (.json)"}
        </Button>
      </div>
      {coverage && (
        <p className="text-sm text-muted-foreground">
          {coverage.memories} memories, text for {coverage.withText}, verified for{" "}
          <span className="font-medium text-foreground">{coverage.verified}</span>.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        What it cannot do yet: let you decrypt the blobs without hippo. The relayer seals them with
        a key server the Walrus Memory SDK does not list, so reading still goes through it. The file
        says this too.
      </p>
    </Section>
  );
}
