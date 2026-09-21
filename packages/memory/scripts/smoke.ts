/**
 * Smoke test against the mainnet relayer.
 *   pnpm smoke            → health + stats (no writes)
 *   pnpm smoke --write    → also writes one memory into hippo-guest:smoke and recalls it
 */
import {
  buildMemoryText,
  createClient,
  guestScope,
  NAMESPACE,
  RelayerExtras,
  readOperatorEnv,
  recallRelevant,
  rememberWithDedupe,
} from "../src/index.ts";

const write = process.argv.includes("--write");
const env = readOperatorEnv();
const operator = {
  key: env.MEMWAL_PRIVATE_KEY,
  accountId: env.MEMWAL_ACCOUNT_ID,
  serverUrl: env.MEMWAL_SERVER_URL,
};
const scope = guestScope(operator, "smoke");
const client = createClient(scope);

console.log("relayer:", env.MEMWAL_SERVER_URL);
console.log("health:", await client.health());
console.log("delegate public key:", await client.getPublicKeyHex());

const extras = new RelayerExtras(operator);
const stats = await extras.stats(scope.namespace);
console.log("owner:", stats.owner);
console.log(
  `namespace ${scope.namespace}: ${stats.memory_count} memories, ${stats.storage_bytes} bytes`,
);
console.log("agents on account:", (await extras.agents()).agents);

if (write) {
  const line = buildMemoryText({
    type: "profile",
    by: "smoke",
    text: `Smoke test run at ${new Date().toISOString()}. Prefers pnpm.`,
  });
  console.log("writing:", line);
  const t0 = Date.now();
  const out = await rememberWithDedupe(client, { text: line, namespace: scope.namespace });
  console.log(`→ ${out.status} blob=${out.blobId} in ${Date.now() - t0} ms`);
  const hits = await recallRelevant(client, {
    query: "which package manager does the user prefer?",
    namespace: scope.namespace,
    limit: 3,
  });
  for (const h of hits) console.log(`  ${h.distance.toFixed(3)}  ${h.text}`);
  console.log(`explorer: https://suiscan.xyz/mainnet/object/${env.MEMWAL_ACCOUNT_ID}`);
} else {
  console.log(
    "pass --write to store and recall one memory (namespace",
    NAMESPACE.guest("smoke"),
    ")",
  );
}
