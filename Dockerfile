# hippo server: Hono API plus the Telegram, Discord and Slack adapters in one
# long-running process. The web app is a separate static build.
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY packages/memory/package.json packages/memory/
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @hippo/server...

COPY packages packages
COPY apps/server apps/server
RUN pnpm typecheck --filter @hippo/server...

ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["pnpm", "--filter", "@hippo/server", "start"]
