#!/usr/bin/env bash
#
# set-domain.sh — point the Syncr site at a new domain in ONE place.
#
# The generator keeps the deployment origin in a single spot:
# tools/build.py -> SITE["origin"]. Everything canonical (og:url,
# canonical links, sitemap.xml, robots.txt, JSON-LD) derives from it.
# This script rewrites that value and rebuilds.
#
# Usage:
#   ./set-domain.sh https://syncr.example.com
#   ./set-domain.sh syncr.example.com        # scheme defaults to https
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$ROOT/tools/build.py"

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <domain-or-url>" >&2
  echo "example: $0 https://syncr.taymaerz.de" >&2
  exit 2
fi

RAW="$1"

# Normalise: add https:// if no scheme, strip any trailing slash.
if [[ "$RAW" != http://* && "$RAW" != https://* ]]; then
  RAW="https://$RAW"
fi
ORIGIN="${RAW%/}"

# Validate shape: scheme://host(.tld) with no spaces.
if ! [[ "$ORIGIN" =~ ^https?://[A-Za-z0-9.-]+(\.[A-Za-z]{2,})(:[0-9]+)?$ ]]; then
  echo "error: '$ORIGIN' does not look like a valid origin (e.g. https://syncr.example.com)" >&2
  exit 1
fi

if [[ ! -f "$BUILD" ]]; then
  echo "error: cannot find $BUILD" >&2
  exit 1
fi

CURRENT="$(grep -oE '"origin":[[:space:]]*"[^"]+"' "$BUILD" | head -1 | sed -E 's/.*"origin":[[:space:]]*"([^"]+)".*/\1/')"
echo "current origin: ${CURRENT:-<none>}"
echo "new origin:     $ORIGIN"

# Rewrite the single source of truth. Use a temp file so a failure
# never leaves build.py half-edited.
python3 - "$BUILD" "$ORIGIN" <<'PY'
import re, sys
path, origin = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    src = f.read()
new, n = re.subn(r'("origin":\s*")[^"]*(")', lambda m: m.group(1) + origin + m.group(2), src, count=1)
if n != 1:
    sys.exit("error: could not locate SITE[\"origin\"] in build.py")
with open(path, "w", encoding="utf-8") as f:
    f.write(new)
print("build.py updated (1 replacement)")
PY

echo "rebuilding site..."
python3 "$BUILD" --check

echo
echo "done. Domain set to $ORIGIN and site rebuilt."
echo "Remember to commit the regenerated HTML, sitemap.xml, and robots.txt."
