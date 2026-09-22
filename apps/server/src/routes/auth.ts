/**
 * Wallet sign-in endpoints. The address is always derived from the signature.
 */
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createChallenge, SESSION_TTL_SECONDS, signInWithWallet, signOut } from "../auth.ts";
import { env } from "../env.ts";

const SESSION_COOKIE = "hippo_session";
const GUEST_COOKIE = "hippo_guest";

const cookieOptions = {
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: env.WEB_BASE_URL.startsWith("https"),
  path: "/",
};

export const authRoutes = new Hono()
  /** Issue a nonce and the exact message the wallet should sign. */
  .post("/api/auth/challenge", async (c) => {
    const { nonce, message } = await createChallenge();
    return c.json({ nonce, message });
  })

  /**
   * Exchange a signature for a session. `address` is deliberately not accepted:
   * it is recovered from the signature, so a caller cannot nominate one.
   */
  .post("/api/auth/verify", async (c) => {
    const body = (await c.req.json()) as { nonce?: string; signature?: string };
    if (!body.nonce || !body.signature) {
      return c.json({ error: "nonce and signature are required" }, 400);
    }

    const guestCookie = getCookie(c, GUEST_COOKIE);
    const result = await signInWithWallet(body.nonce, body.signature, undefined);
    if (!result.ok) {
      const message =
        result.reason === "signature"
          ? "That signature does not match the challenge."
          : "That sign-in link has expired. Ask for a new one.";
      return c.json({ error: message }, 401);
    }

    setCookie(c, SESSION_COOKIE, result.sessionId, {
      ...cookieOptions,
      maxAge: SESSION_TTL_SECONDS,
    });
    // The guest cookie is left in place; the session takes precedence, and the
    // guest identity stays usable if the person signs out.
    return c.json({
      ok: true,
      mode: result.person.mode,
      address: result.address,
      hadGuestCookie: Boolean(guestCookie),
      // A cross-origin page cannot read the cookie, so it keeps this instead.
      // Same-origin pages ignore it and use the HttpOnly cookie.
      sessionId: result.sessionId,
    });
  })

  .post("/api/auth/signout", async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE) ?? c.req.header("x-hippo-session");
    if (sessionId) await signOut(sessionId);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

export { GUEST_COOKIE, SESSION_COOKIE };
