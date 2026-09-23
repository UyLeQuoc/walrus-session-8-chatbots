#!/usr/bin/env bash
# Snapshot production's evidence into a dated file, and print it.
#
# `pnpm evidence` on its own reads DATABASE_URL from .env, which is the local
# Postgres. During the real-use week that would quietly record a developer's own
# test chatter as the result, so this one points at production explicitly and
# fails rather than guessing if it cannot find it.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env.production ]; then
    DATABASE_URL="$(grep '^DATABASE_URL=' .env.production | cut -d= -f2-)"
  fi
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "No production DATABASE_URL. Put it in .env.production or pass it in." >&2
  exit 1
fi
export DATABASE_URL

day="$(date -u +%Y-%m-%d)"
out="docs/evidence/daily/${day}.md"
mkdir -p docs/evidence/daily

{
  echo "<!-- Written by scripts/evidence-daily.sh against production. Do not edit. -->"
  pnpm --silent evidence
  echo
  pnpm --silent capacity
} > "$out"

echo "wrote $out"
tail -n +2 "$out"
