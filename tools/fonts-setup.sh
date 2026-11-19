#!/usr/bin/env bash
# Decompress the bundled variable fonts into static instances used by
# tools/render-screenshots.mjs (resvg cannot select weights from a variable font).
#
# Requires: python3 with fonttools + brotli  →  pip install fonttools brotli
set -euo pipefail

cd "$(dirname "$0")/.."

if ! python3 -c "import fontTools" >/dev/null 2>&1; then
  echo "fonttools is missing. Install it with:"
  echo "  python3 -m pip install --user fonttools brotli"
  exit 1
fi

mkdir -p tools/.fonts

python3 - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

INTER = 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
SPACE = 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2'


def make(src, weight, family, out):
    font = TTFont(src)
    instance = instantiateVariableFont(font, {'wght': weight}, updateFontNames=False)
    instance.flavor = None
    name = instance['name']
    for record in list(name.names):
        if record.nameID in (1, 16):
            name.setName(family, record.nameID, record.platformID, record.platEncID, record.langID)
    instance['OS/2'].usWeightClass = weight
    instance.save(out)
    print('  ' + out)


for weight in (400, 500, 600, 700):
    make(INTER, weight, 'InterVar', f'tools/.fonts/Inter-{weight}.ttf')
for weight in (400, 500, 600, 700):
    make(SPACE, weight, 'Space Grotesk Var', f'tools/.fonts/Space-{weight}.ttf')
PY

echo "Static fonts ready in tools/.fonts — run: npm run screenshots"
