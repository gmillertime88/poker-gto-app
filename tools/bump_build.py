#!/usr/bin/env python3
import argparse
import re
from datetime import datetime
from pathlib import Path

APP_JS_PATH = Path(__file__).resolve().parents[1] / "app.js"
VERSION_PATTERN = re.compile(r'const BUILD_VERSION = "([^"]+)";')
TIMESTAMP_PATTERN = re.compile(r'const BUILD_TIMESTAMP = "([^"]+)";')


def bump_version(version: str) -> str:
    parts = version.split(".")
    if not parts:
        return "1"

    last = parts[-1]
    if last.isdigit():
        width = len(last)
        parts[-1] = str(int(last) + 1).zfill(width)
        return ".".join(parts)

    return f"{version}.1"


def main() -> int:
    parser = argparse.ArgumentParser(description="Bump BUILD_VERSION and BUILD_TIMESTAMP in app.js")
    parser.add_argument("--dry-run", action="store_true", help="Show new values without writing app.js")
    args = parser.parse_args()

    content = APP_JS_PATH.read_text(encoding="utf-8")

    version_match = VERSION_PATTERN.search(content)
    timestamp_match = TIMESTAMP_PATTERN.search(content)

    if not version_match or not timestamp_match:
        raise RuntimeError("Could not find BUILD_VERSION and BUILD_TIMESTAMP constants in app.js")

    old_version = version_match.group(1)
    new_version = bump_version(old_version)
    new_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    updated = VERSION_PATTERN.sub(f'const BUILD_VERSION = "{new_version}";', content, count=1)
    updated = TIMESTAMP_PATTERN.sub(f'const BUILD_TIMESTAMP = "{new_timestamp}";', updated, count=1)

    print(f"BUILD_VERSION: {old_version} -> {new_version}")
    print(f"BUILD_TIMESTAMP -> {new_timestamp}")

    if args.dry_run:
        return 0

    APP_JS_PATH.write_text(updated, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
