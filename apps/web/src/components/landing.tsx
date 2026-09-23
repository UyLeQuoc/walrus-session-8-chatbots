/**
 * What a judge sees in the first five seconds.
 *
 * Before this, the page opened on a chat box and three lines of instructions,
 * which explains nothing about why the project exists. The claim that makes
 * hippo different is not "it remembers"; every chatbot remembers. It is that
 * the memory is an object on a public chain that you can take away from the
 * bot.
 *
 * So the section leads with that claim, shows the three steps in the order they
 * happen, and then backs it with numbers read live from the same query the
 * evidence script uses. It disappears the moment there is a conversation to
 * read instead, because by then the reader has something better to look at.
 */

import HowItWorks from "@/components/blocks/how-it-works-5";
import DecryptedText from "@/components/DecryptedText";
import { LiveStats } from "@/components/live-stats";

const SUISCAN = "https://suiscan.xyz/mainnet/object/";

export function Landing({ operatorAccountId }: { operatorAccountId?: string }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {/*
          The headline resolves out of noise on first view. It is the one effect
          on the page and it is here because it is literally what the project
          does: every memory is ciphertext on Walrus that only the owning
          account can turn back into words.
        */}
        <h1 className="text-xl font-semibold tracking-tight">
          <DecryptedText
            text="A chatbot that remembers you, on memory you own"
            animateOn="view"
            sequential
            revealDirection="start"
            speed={28}
            maxIterations={12}
            characters="01?#$%&*+=/\<>abcdef"
            parentClassName="tracking-tight"
            encryptedClassName="text-muted-foreground"
          />
        </h1>
        <p className="text-sm text-muted-foreground">
          Every chatbot remembers. The difference here is where the memory lives. Yours is an
          encrypted blob on Walrus, indexed by an account on Sui, and hippo reaches it with a
          delegate key you can revoke on chain at any time.
        </p>
      </div>

      <HowItWorks />

      <LiveStats />

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
          </>
        ) : null}
        . Type <code>/help</code> for the commands, or <code>/connect</code> to move it to your own.
      </p>
    </div>
  );
}
