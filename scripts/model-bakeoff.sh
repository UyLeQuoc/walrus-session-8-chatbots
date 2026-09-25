#!/usr/bin/env bash
# Run `bun run demo` on a model and report what it cost and whether it passed.
#
# Cost is measured, not derived from a price list: OpenRouter's key endpoint is
# read before and after, so the number includes whatever the model actually did,
# including retries and reasoning tokens that a per-token table hides.
set -uo pipefail
cd "$(dirname "$0")/.."

model="${1:?usage: model-bakeoff.sh <openrouter-model-id>}"
key="$(grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2-)"

spend() {
  curl -s -H "Authorization: Bearer $key" https://openrouter.ai/api/v1/key \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["usage"])'
}

before="$(spend)"
start=$(date +%s)
LLM_MODEL="$model" bun run --silent demo > "/tmp/bakeoff-$(echo "$model" | tr '/:' '__').log" 2>&1
status=$?
elapsed=$(( $(date +%s) - start ))
sleep 5                      # OpenRouter's usage figure lags a moment
after="$(spend)"

python3 - "$model" "$before" "$after" "$status" "$elapsed" <<'PY'
import sys
model, before, after, status, elapsed = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
cost = after - before
verdict = "PASS" if status == 0 else f"FAIL (exit {status})"
print(f"{model:<42} {verdict:<14} ${cost:.5f}  {elapsed}s")
if cost > 0:
    # The eval is four questions after five teaching turns, so one run is a
    # reasonable stand-in for a busy user's day.
    print(f"  {'':<42} {'':<14} 525 turns would cost about ${cost / 9 * 525:.2f}")
PY
