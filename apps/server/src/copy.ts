/**
 * Everything hippo says to a person before they have said anything back.
 *
 * Separated from the command plumbing for two reasons. It is the copy most
 * likely to be wrong and least likely to be reviewed, and it has no business
 * importing a database, which is what kept it untested while it was living
 * inside commands.ts.
 */

/**
 * What actually happens to what you say, in the words a person would use.
 *
 * Every number here is measured, not estimated: storage lifetime from
 * docs/SPIKES.md (a memory written today gets about 210 days), and the fact
 * that ciphertext is publicly fetchable from the aggregator round trip in
 * docs/issues/12. The paragraph about not being able to delete is the
 * uncomfortable one and is the reason this command exists rather than a line in
 * /help: somebody inviting friends to test this should not be the one who has
 * to explain it.
 */
export const PRIVACY = `What happens to what you tell me:

• I decide what is worth keeping and write it to Walrus, a public storage network. Each memory is encrypted. Anyone can download the encrypted bytes; only the account that owns them can read them.
• Storage is paid per period. A memory written today lasts about seven months, then the bytes expire.
• Your memory lives in a space named after a random id, not your name or your handle. That name is visible on Sui.
• Until you run /connect, that space sits inside my own Walrus Memory account. After /connect it is in an account your wallet owns, and /disconnect takes my access away on chain.

What you can do:

• /memory off stops me remembering anything new. /memory on resumes.
• /memory shows everything I hold. /memory forget makes it all unrecallable.

One limit worth knowing: forgetting removes it from search so nothing can bring it back, but the encrypted bytes stay on Walrus until they expire. Nobody can delete them early, including me. If that is not a trade you want, /memory off before you tell me anything.`;

/**
 * `/start` is the only copy most people will read, so it says the one thing that
 * makes hippo different rather than listing commands. `/help` does the listing.
 *
 * It also has to disclose, in two sentences, that this writes to a public
 * network. Somebody should never learn that from an article afterwards, and
 * burying it in /help would be the same as not saying it.
 */
export function welcome(surveyUrl?: string): string {
  const lines = [
    "I remember what you tell me, across conversations and across channels.",
    "",
    "The part that is unusual: that memory can belong to you, not to me. Run /connect and it moves into a Walrus Memory account owned by your own wallet, where /disconnect takes my access away on-chain whenever you want.",
    "",
    "Before you start: what I remember gets written to Walrus, a public storage network, encrypted. Anyone can download the encrypted bytes, only the owning account can read them, and they last about seven months. /privacy has the detail and /memory off stops me remembering anything.",
    "",
    "Otherwise just talk to me. /memory shows what I have, /help lists everything.",
  ];
  if (surveyUrl) {
    lines.push(
      "",
      `If you have a minute afterwards, telling me how it went helps a lot: ${surveyUrl}`,
    );
  }
  return lines.join("\n");
}

export const HELP = `hippo remembers what you tell it, and the memory belongs to you.

/memory            what I remember about you
/memory search <q> search your memory
/memory off | on   pause or resume remembering
/memory forget     make everything unrecallable
/privacy           what is stored, where, and for how long
/link              use the same memory on another channel
/whoami            your account and where the memory lives
/proof             the memories behind my last answer
/connect           own your memory in your own Walrus account
/disconnect        revoke my access on-chain
/help              this message`;
