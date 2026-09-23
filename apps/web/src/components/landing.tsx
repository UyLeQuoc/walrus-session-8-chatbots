/**
 * What a judge sees in the first five seconds.
 *
 * Before this, the page opened on a chat box and three lines of instructions,
 * which explains nothing about why the project exists. The claim that makes
 * hippo different is not "it remembers"; every chatbot remembers. It is that
 * the memory is an object on a public chain that you can take away from the
 * bot. So the section links the real account on Sui rather than asserting it,
 * and it disappears the moment there is a conversation to read instead.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SUISCAN = "https://suiscan.xyz/mainnet/object/";

const STEPS = [
  {
    badge: "now",
    title: "Talk to it",
    body: "Say something about yourself. hippo decides what is worth keeping, writes it to Walrus encrypted, and shows you which memories it used in every answer.",
  },
  {
    badge: "/connect",
    title: "Take ownership",
    body: "Sign one transaction and the memory moves into a Walrus Memory account that you own on Sui. hippo keeps only a delegate key. Gas is normally sponsored, so it costs you nothing.",
  },
  {
    badge: "/disconnect",
    title: "Take it away",
    body: "Remove that key on chain and hippo stops being able to read or write, within about a minute. Nobody has to be asked, and hippo does not have to cooperate.",
  },
];

export function Landing({ operatorAccountId }: { operatorAccountId?: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold tracking-tight">
          A chatbot that remembers you, on memory you own
        </h1>
        <p className="text-sm text-muted-foreground">
          Every chatbot remembers. The difference here is where the memory lives. Yours is an
          encrypted blob on Walrus, indexed by an account on Sui, and hippo reaches it with a
          delegate key you can revoke on chain at any time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.title}>
            <CardContent className="space-y-1.5 p-3">
              <Badge variant="outline">{s.badge}</Badge>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border p-3 text-xs text-muted-foreground">
        <p className="text-foreground">Before you start</p>
        <p className="mt-1">
          What hippo remembers is written to Walrus, a public storage network, encrypted. Anyone can
          download the encrypted bytes, only the owning account can read them, and they last about
          seven months. Forgetting removes a memory from search but cannot delete the bytes early.
          Type <code>/privacy</code> for the detail, or <code>/memory off</code> to stop hippo
          remembering anything at all.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Until you connect a wallet, your memory lives under hippo's own account
        {operatorAccountId ? (
          <>
            ,{" "}
            <a
              className="font-mono underline"
              href={`${SUISCAN}${operatorAccountId}`}
              target="_blank"
              rel="noreferrer"
            >
              {operatorAccountId.slice(0, 10)}…
            </a>
            , on Sui mainnet
          </>
        ) : null}
        . Type <code>/help</code> for the commands, or <code>/connect</code> to move it to your own.
      </p>
    </div>
  );
}
