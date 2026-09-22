/**
 * The API is same-origin in production: `apps/web/vercel.json` rewrites
 * `/api/*` to the Railway service.
 *
 * This is not a deployment detail, it is what makes the product work. The
 * session cookie is `SameSite=Lax`, which browsers do not send on cross-site
 * requests, so with the API on `railway.app` and the page on `vercel.app` the
 * cookie was set and never returned: every message arrived as a brand new
 * person and the bot looked like it had amnesia. Proxying keeps the two
 * same-site, which also keeps `SameSite=Lax` as a real CSRF defence rather
 * than trading it away for `SameSite=None`.
 *
 * `VITE_API_URL` stays as an override for local development, where the Vite
 * dev server and the API are on different ports.
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
