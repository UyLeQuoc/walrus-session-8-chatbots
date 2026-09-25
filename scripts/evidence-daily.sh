#!/usr/bin/env bash
# Snapshot production's evidence into a dated file, and print it: first what
# went wrong in the last 24 hours (`bun run ops`), then the counts, then capacity.
#
# `bun run evidence` on its own reads DATABASE_URL from .env, which is the local
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

# What went wrong comes first: it is the part that changes what you do today.
# `bun run ops` exits 1 when it could not read the logs; the file is still written,
# and says so, but this script then fails so a cron or a tired eye notices.
ops_ok=1
{
  echo "<!-- Written by scripts/evidence-daily.sh against production. Do not edit. -->"
  bun run --silent ops || ops_ok=0
  echo
  bun run --silent evidence
  echo
  bun run --silent capacity
} > "$out"

echo "wrote $out"
tail -n +2 "$out"
echo
grep '^Verdict:' "$out" || true
if [ "$ops_ok" = 0 ]; then
  echo "The logs were not read; see LOGS NOT READ above." >&2
  exit 1
fi
