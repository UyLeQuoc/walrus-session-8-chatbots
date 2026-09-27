import { useShellTitle } from "@/app/shell";
import { CopyButton } from "@/components/copy-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMe } from "@/features/me/use-me";

const COMMANDS: Array<[string, string]> = [
  ["/memory", "what hippo remembers"],
  ["/memory search", "read it back from Walrus"],
  ["/memory forget <blob>", "stop using one memory"],
  ["/memory forget all", "make everything unrecallable"],
  ["/proof", "blobs behind the last answer"],
  ["/export", "download your memory"],
  ["/team", "share a memory"],
  ["/link", "same memory, another channel"],
  ["/connect", "own it in your account"],
  ["/disconnect", "revoke hippo on chain"],
  ["/privacy", "what is stored, and for how long"],
];

const CLAUDE_CODE_STEPS = [
  "/plugin marketplace add MystenLabs/MemWal",
  "/plugin install memwal@memwal-plugins",
  "restart, then memwal_login with the same wallet",
  'ask it: "recall what you know about me", namespace hippo',
];

export function GuidePage() {
  const { me } = useMe();
  useShellTitle("How it works");

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto px-4 py-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">In the app</h2>
        <p className="text-sm text-muted-foreground">
          The chat is the words back and forth. It stays on this server, encrypted, so a reload can
          show it again. It is not written to Walrus. A memory is a fact hippo decides is worth
          keeping. <code className="font-mono text-xs">/memory off</code> stops new facts. It does
          not delete the chat, and it does not delete what is already stored.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Guest, then your account</h2>
        <p className="text-sm text-muted-foreground">
          Before you connect, memory sits in a namespace named{" "}
          <code className="font-mono text-xs">hippo-guest:…</code> inside hippo's own Walrus Memory
          account. After <code className="font-mono text-xs">/connect</code>, new facts go to an
          account your wallet owns. Facts from before that cannot be moved.{" "}
          <code className="font-mono text-xs">/disconnect</code> removes hippo's delegate key on
          chain, so hippo can no longer read your account. What you said as a guest stays in hippo's
          account. <code className="font-mono text-xs">/memory forget all</code> makes that
          unrecallable. It still cannot delete the encrypted bytes early.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">On chain</h2>
        <p className="text-sm text-muted-foreground">
          The account is an object on Sui. The delegate key is hippo's permission to read and write
          it. The explorer links on My memory open that object and the owning wallet. Each memory is
          an encrypted blob on Walrus. Anyone can download the ciphertext. Only the owning account
          can read it. A blob written today lasts about seven months, then it expires. Nothing,
          including hippo, can delete it sooner.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Commands</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Command</TableHead>
              <TableHead>What it does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMMANDS.map(([command, what]) => (
              <TableRow key={command}>
                <TableCell className="font-mono">{command}</TableCell>
                <TableCell>{what}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Claude Code</h2>
        <p className="text-sm text-muted-foreground">Same wallet, namespace hippo.</p>
        <ol className="flex flex-col gap-2">
          {CLAUDE_CODE_STEPS.map((step) => (
            <li key={step} className="flex items-center gap-2">
              <code className="min-w-0 flex-1 font-mono text-xs [overflow-wrap:anywhere]">
                {step}
              </code>
              <CopyButton value={step} label="step" />
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Team</h2>
        <p className="text-sm text-muted-foreground">
          A team shares memory that anyone in it can recall. Ordinary chat stays yours. Only{" "}
          <code className="font-mono text-xs">/team remember</code> adds to the shared pile. That
          pile lives in hippo's account, so no member owns it. Leaving does not take back what you
          added: a memory on Walrus cannot be deleted.
        </p>
      </section>

      {me?.surveyUrl ? (
        <p className="text-sm text-muted-foreground">
          Used hippo for a bit?{" "}
          <a className="underline" href={me.surveyUrl} target="_blank" rel="noreferrer">
            Tell me how it went
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
