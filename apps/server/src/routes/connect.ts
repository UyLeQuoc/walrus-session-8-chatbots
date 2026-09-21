/**
 * The owned-mode handshake. The browser does the wallet work; this decides
 * whether it really happened by reading the account on chain.
 */
import { channelIdentities, connectTokens, delegateKeys, eq, people } from "@hippo/db";
import { createSuiClient, fetchRelayerConfig, isDelegateRegistered } from "@hippo/memory";
import { Hono } from "hono";
import { db } from "../app-context.ts";
import { loadToken } from "../connect.ts";
import { env } from "../env.ts";
import { mergePersons, personByWallet } from "../persons.ts";

const sui = createSuiClient(env.SUI_NETWORK);

export const connectRoutes = new Hono()
  /** Deployment parameters the web app needs. The package is upgradeable, so it is read live. */
  .get("/api/config", async (c) => {
    const cfg = await fetchRelayerConfig(env.MEMWAL_SERVER_URL).catch(() => null);
    return c.json({
      network: env.SUI_NETWORK,
      relayerUrl: env.MEMWAL_SERVER_URL,
      packageId: cfg?.packageId ?? env.MEMWAL_PACKAGE_ID,
      registryId: env.MEMWAL_REGISTRY_ID,
    });
  })

  /** What the connect page needs to render, without leaking anything secret. */
  .get("/api/connect/:token", async (c) => {
    const row = await loadToken(c.req.param("token"));
    if (!row) return c.json({ error: "This link has expired. Run /connect again." }, 404);
    const [key] = row.delegateKeyId
      ? await db.select().from(delegateKeys).where(eq(delegateKeys.id, row.delegateKeyId)).limit(1)
      : [];
    if (!key) return c.json({ error: "No delegate key on this link." }, 404);
    const [person] = await db.select().from(people).where(eq(people.id, row.personId)).limit(1);
    return c.json({
      kind: row.kind,
      publicKey: key.publicKeyHex,
      label: key.label,
      expiresAt: row.expiresAt,
      accountId: person?.accountId ?? null,
    });
  })

  /**
   * The browser says the transaction landed. Verify on chain before believing it:
   * a forged callback must not be able to flip a person into owned mode.
   */
  .post("/api/connect/:token/done", async (c) => {
    const row = await loadToken(c.req.param("token"));
    if (!row) return c.json({ error: "This link has expired." }, 404);
    const body = (await c.req.json()) as {
      accountId?: string;
      walletAddress?: string;
      digest?: string;
    };
    if (!body.accountId || !/^0x[0-9a-fA-F]{64}$/.test(body.accountId)) {
      return c.json({ error: "accountId missing or malformed." }, 400);
    }
    const [key] = row.delegateKeyId
      ? await db.select().from(delegateKeys).where(eq(delegateKeys.id, row.delegateKeyId)).limit(1)
      : [];
    if (!key) return c.json({ error: "No delegate key on this link." }, 404);

    const registered = await isDelegateRegistered(sui, body.accountId, key.publicKeyHex);

    if (row.kind === "connect") {
      if (!registered) {
        return c.json(
          {
            error:
              "That account does not list hippo's delegate key yet. Give the transaction a moment, then retry.",
          },
          409,
        );
      }
      // If this wallet already belongs to a person from another channel, this is
      // the same human arriving by a second route: fold the two together so the
      // memory follows them rather than splitting in half.
      let personId = row.personId;
      if (body.walletAddress) {
        const existing = await personByWallet(body.walletAddress);
        if (existing && existing.id !== personId) {
          await mergePersons(existing.id, personId);
          personId = existing.id;
        }
      }

      await db.transaction(async (tx) => {
        await tx
          .update(delegateKeys)
          .set({ status: "active", addTxDigest: body.digest ?? null })
          .where(eq(delegateKeys.id, key.id));
        await tx
          .update(people)
          .set({
            mode: "owned",
            accountId: body.accountId,
            walletAddress: body.walletAddress ?? null,
          })
          .where(eq(people.id, row.personId));
        if (body.walletAddress) {
          await tx
            .insert(channelIdentities)
            .values({
              personId: row.personId,
              channel: "wallet",
              externalId: body.walletAddress.toLowerCase(),
            })
            .onConflictDoNothing();
        }
        await tx
          .update(connectTokens)
          .set({ usedAt: new Date() })
          .where(eq(connectTokens.token, row.token));
      });
      return c.json({ ok: true, mode: "owned", accountId: body.accountId });
    }

    // Disconnect: the key must be gone from the account before we stand down.
    if (registered) {
      return c.json(
        {
          error:
            "hippo's key is still registered on that account. Give the transaction a moment, then retry.",
        },
        409,
      );
    }
    await db.transaction(async (tx) => {
      await tx
        .update(delegateKeys)
        .set({ status: "revoked", removeTxDigest: body.digest ?? null, revokedAt: new Date() })
        .where(eq(delegateKeys.id, key.id));
      await tx.update(people).set({ mode: "guest" }).where(eq(people.id, row.personId));
      await tx
        .update(connectTokens)
        .set({ usedAt: new Date() })
        .where(eq(connectTokens.token, row.token));
    });
    return c.json({ ok: true, mode: "guest" });
  });
