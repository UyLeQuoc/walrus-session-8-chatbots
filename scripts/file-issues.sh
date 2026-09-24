#!/usr/bin/env bash
# File the drafted bug reports against MystenLabs/MemWal.
#
# Each file in docs/issues/ is a complete report: the first heading is the
# title, the rest is the body. Run with --dry-run first; it prints exactly what
# would be sent. Needs `gh auth login`.
#
#   scripts/file-issues.sh --dry-run
#   scripts/file-issues.sh 01 02 03 04 05     # a subset, in that order
#   scripts/file-issues.sh                    # all of them
set -euo pipefail

REPO="MystenLabs/MemWal"
DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/issues"
DRY=0
PICKS=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    *) PICKS+=("$arg") ;;
  esac
done

files=()
if [ ${#PICKS[@]} -gt 0 ]; then
  for p in "${PICKS[@]}"; do
    match="$(find "$DIR" -name "${p}-*.md" -print -quit)"
    if [ -z "$match" ]; then
      echo "no draft matching '${p}-*.md'" >&2
      exit 1
    fi
    files+=("$match")
  done
else
  # A draft that is retracted, did not reproduce, was resolved upstream or is
  # on hold is kept for the record, not for filing. Naming one explicitly
  # still works; sweeping them all up must not post it.
  while IFS= read -r f; do
    # `|| true`: no status is the normal case, and grep finding nothing must not
    # end the script under `set -e`, which it did, silently.
    status="$(head -1 "$f" | grep -oE '^# (RETRACTED|NOT REPRODUCED|RESOLVED BEFORE FILING|ON HOLD)' | sed 's/^# //' || true)"
    if [ -n "$status" ]; then
      echo "skipping $(basename "$f") ($(echo "$status" | tr 'A-Z' 'a-z'))" >&2
      continue
    fi
    files+=("$f")
  done < <(find "$DIR" -name '[0-9][0-9]-*.md' | sort)
fi

if [ "$DRY" -eq 0 ]; then
  command -v gh >/dev/null || { echo "gh is not installed" >&2; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "run: gh auth login" >&2; exit 1; }
fi

for f in "${files[@]}"; do
  title="$(head -1 "$f" | sed 's/^# *//')"
  body="$(tail -n +2 "$f")"
  echo "-- $(basename "$f")"
  echo "   title: $title"
  if [ "$DRY" -eq 1 ]; then
    echo "   body:  $(printf '%s' "$body" | wc -l | tr -d ' ') lines, would post to $REPO"
    continue
  fi
  url="$(printf '%s' "$body" | gh issue create --repo "$REPO" --title "$title" --body-file -)"
  echo "   filed: $url"
  # Record the link beside the draft so the submission form can be filled from it.
  printf '\n<!-- filed: %s -->\n' "$url" >> "$f"
  sleep 2
done

echo
echo "Paste the filed URLs into docs/submission.md under the feedback question."
