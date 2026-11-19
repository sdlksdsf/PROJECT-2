#!/usr/bin/env python3
"""Write a SHA256SUMS.txt next to the release assets.

Usage: python3 tools/checksums.py <assets-dir>
"""
from __future__ import annotations

import hashlib
import pathlib
import sys

SKIP_PREFIXES = ("SHA256SUMS", "builder-debug", "builder-effective-config")
SKIP_SUFFIXES = (".blockmap", ".yml")


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts")
    files = [
        path
        for path in sorted(root.rglob("*"))
        if path.is_file()
        and not path.name.startswith(SKIP_PREFIXES)
        and not path.name.endswith(SKIP_SUFFIXES)
    ]
    if not files:
        print(f"no assets found in {root}", file=sys.stderr)
        return 1

    lines = []
    for path in files:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        lines.append(f"{digest.hexdigest()}  {path.name}")
        print(f"hashed {path.name} ({path.stat().st_size} bytes)")

    target = root / "SHA256SUMS.txt"
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nwrote {target} with {len(lines)} entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
