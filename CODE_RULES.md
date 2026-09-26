# CODE_RULES

This file is the highest rule for writing code in this repo. It outranks nearby files, older docs, and habit. Read it before editing. If `AGENTS.md` and this file disagree about *how* to write code, this file wins. Product constraints in `AGENTS.md` (mainnet, keys, models, namespaces) still apply; they are not a license to ignore these rules.

Match these rules in new and changed code. Do not copy a violation because the file next door already does it. When you touch a violating file, bring the lines you change into compliance. Do not rewrite the whole file unless that is the task.

## TypeScript

- Strict mode stays on. Do not weaken `tsconfig` to make a change compile.
- No `any`. No `as any`. No `// @ts-ignore` and no `// @ts-expect-error` unless the line says why the types are wrong and a follow-up exists.
- Prefer `unknown` at a boundary, then narrow. A cast is a last resort, and only after a runtime check.
- External input is untrusted. Parse it with zod (request bodies, env, webhook payloads, tool arguments). Infer the type from the schema (`z.infer`) instead of declaring a parallel interface.
- Exported functions take and return explicit types when the inferred type would leak a library's internals or an anonymous object. Do not annotate what the compiler already knows.
- No non-null assertion (`!`) on a value that might be missing. Handle the missing case.
- Prefer a union and an exhaustive `switch` over boolean flags and stringly modes. `never` in the default branch.
- Do not use enums. Use a const object or a string union.
- Async functions do not swallow errors. Catch only to translate into a typed result or a user-facing sentence, then rethrow or return that result. No empty `catch`.
- No floating promises. `await` them, or pass them to something that handles rejection.
- Imports are type-only when they are types (`import type`). The server keeps the `.ts` extension on relative imports. The web app uses the `@/` alias.
- No barrel `index.ts`. Import the module that owns the symbol.
- No default exports, except a file a tool requires one from (Vite config, a shadcn primitive that already has one).
- Do not add comments. Names and types carry the meaning. A comment is allowed only when the next reader would otherwise repeat a measured mistake (a relayer quirk, a security reason).

## Reuse

- A pure function with no I/O is the default unit of reuse. It takes data in and returns data out. No hidden `db`, `env`, or `fetch`.
- The second caller extracts. The first caller stays inline unless leaving it inline mixes two jobs in one file (HTTP plus domain, render plus request).
- Copy-paste of more than a few lines is a bug. Share the function. Do not share by reaching into another feature's private file for one helper; move the helper up to the folder both already import.
- Do not invent a wrapper, a base class, or a generic "utils" bag for one call site. `lib/` and `packages/` hold code that already has two callers, or a boundary (env, crypto, HTTP client) that must not be reimplemented.
- Dependencies point inward. A UI file does not import a server module. A channel adapter does not import a route. A domain module does not import Hono, grammY, discord.js, or Bolt.
- Configuration and copy that can change without a behavior change live next to the code that reads them, not inlined in three switches.

## Frontend (`apps/web`)

### Where files go

- A route screen lives in `src/features/<feature>/<feature>-page.tsx`.
- A component used by one feature lives in that feature folder. A component used by two features lives in `src/components/`.
- shadcn primitives stay in `src/components/ui/`. prompt-kit stays in `src/components/prompt-kit/`. Do not move them. Do not edit them to restyle one screen. Add a primitive with the shadcn CLI, then compose it.
- Shared chrome (logo, theme) stays in `src/components/`. App shell stays in `src/app/`.

### Logic stays out of the render

Pages and components render. They do not own rules.

- A page or component does not `fetch`, does not parse an API payload, does not decide a business rule, and does not run a multi-step flow (connect, export, hide, sign-in).
- That work lives in a hook colocated with the feature: `src/features/<feature>/use-<name>.ts`. A hook shared by two features lives in `src/hooks/`.
- The hook returns data, status, and callbacks. The component calls the hook and paints what it returns.
- A component may keep ephemeral UI state only: open or closed, focus, a draft that has not been submitted. The moment that state is sent, stored, or branched on a rule, it moves into the hook.
- Do not put `useEffect` data loading in a page or a panel. The page calls `useMe()`; `useMe` owns the request, the error sentence, and the reload.
- A hook does not return JSX.

### shadcn

If shadcn has the primitive, use it. Do not hand-roll a button, input, textarea, card, badge, alert, dialog, sheet, tooltip, skeleton, separator, or sidebar.

- Import from `@/components/ui/<name>`.
- Compose with `className` for layout only: width, max-width, gap from the parent. Do not restyle the primitive's height, padding, radius, or type scale to invent a new size.
- `size="sm"` is forbidden on every shadcn component that has a size variant, including `Button`. So is any class that imitates it (`h-7`, `h-8`, `px-2`, `text-xs` on the control itself). The default size is the size.
- A smaller control is allowed only when the user has explicitly said that specific control may be small. Do not infer permission from a tight layout or a mobile width.
- Icons come from `lucide-react`, the library named in `components.json`. Do not add a second icon set for one screen.
- Class names merge through `cn` from `@/lib/utils`. Do not write a second `cn`.
- Do not add `"use client"`. This app is Vite, not Next.

### What a component file looks like

A component file exports a named function component, takes props, and returns elements. If the file also exports a pure formatter used by one sibling, that formatter moves to a `.ts` file beside it the moment a second component needs it. API types shared with a hook live next to the hook, not inside the TSX.

## Backend (`apps/server`)

### Where files go

- `src/routes/` is the HTTP surface. A route file parses the request, checks the caller, calls a domain function, and maps the result to a status and a body. It does not contain the rule.
- New behavior goes in the domain folder that already owns it: `chat/`, `identity/`, `connect/`, `memory/`, `channels/`. Do not add another case to `routes/chat.ts` or `chat/commands.ts` if the work can live in a module those files call.
- `src/channels/` translates a platform event into `handleIncoming` and a reply back out. No SQL, no memory, no model call, no command policy.
- `src/env/load.ts` exits the process on a bad env. Tests and libraries import `src/env/schema.ts`. Only the process entry imports `load.ts`.
- `src/ops/` is for scripts. The running server does not import it.

### Boundaries

- Validate every body, query, and header you branch on, with zod, at the route. Do not trust `c.req.json()` as `any`.
- Domain functions take already-parsed values and a small context (`db`, `env` fields they need). They do not take a Hono `Context`.
- One function, one failure mode the caller can handle. Return a typed result (`{ ok: true, ... } | { ok: false, reason }`) for expected failures (unknown token, rate limit, not found). Throw for programmer errors and for upstream faults the route will turn into one sentence.
- A sentence shown to a user names what failed and what they can do. It does not include a stack, a SQL fragment, a private key, a token, or the upstream JSON.
- Do not log a private key, a session token, a delegate key, or memory text. Log an id, a status, and a reason code.
- Channel command names are declared once and imported by Telegram, Discord, and Slack registration. Do not keep a second handwritten list.
- Scripts that are one-off probes stay in `scripts/archive/`. A script a human runs on a schedule stays in `scripts/` and is wired from `package.json`.

### Data

- Memory text is not a column. Postgres holds ids, hashes, types, and dates. Text comes back from Walrus.
- A write that tells the user it was saved must be recoverable if the process dies after that sentence. Do not acknowledge a memory the index cannot see.
- Namespace strings are built in `packages/memory`, not concatenated in a route.

## Tests

- A test sits next to the module it imports, and the file name matches that module (`limits.test.ts` tests `limits.ts`, not `turn.ts`).
- Test the pure function and the hook's rule. Do not snapshot a page to avoid naming the behavior.
- A test that needs Postgres or mainnet skips itself when the credential is absent. It does not fake a passing result.
- Do not delete or weaken an assertion to go green.

## Before you finish

`bun run typecheck`, `bun run lint`, and `bun run test` are green. Lint fails on warnings. Unused imports are not a style preference; they are a failed check.
