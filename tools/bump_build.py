#!/usr/bin/env python3
import argparse
import re
from datetime import datetime
from pathlib import Path

ROOT_PATH = Path(__file__).resolve().parents[1]
APP_JS_PATH = ROOT_PATH / "app.js"
ODDS_JS_PATH = ROOT_PATH / "odds.js"
TARGET_FILES = [APP_JS_PATH, ODDS_JS_PATH]
VERSION_PATTERN = re.compile(r'const BUILD_VERSION = "([^"]+)";')
TIMESTAMP_PATTERN = re.compile(r'const BUILD_TIMESTAMP = "([^"]+)";')


def bump_version(version: str) -> str:
    parts = version.split(".")

    if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
        major = int(parts[0])
        minor = int(parts[1]) + 1
        if minor >= 10:
            major += 1
            minor = 0
        return f"{major}.{minor}"

    if version.isdigit():
        return f"{version}.1"

    return "1.1"


def main() -> int:
    parser = argparse.ArgumentParser(description="Bump BUILD_VERSION and BUILD_TIMESTAMP in app.js and odds.js")
    parser.add_argument("--dry-run", action="store_true", help="Show new values without writing files")
    args = parser.parse_args()

    app_content = APP_JS_PATH.read_text(encoding="utf-8")

    version_match = VERSION_PATTERN.search(app_content)
    timestamp_match = TIMESTAMP_PATTERN.search(app_content)

    if not version_match or not timestamp_match:
        raise RuntimeError("Could not find BUILD_VERSION and BUILD_TIMESTAMP constants in app.js")

    old_version = version_match.group(1)
    new_version = bump_version(old_version)
    new_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    print(f"BUILD_VERSION: {old_version} -> {new_version}")
    print(f"BUILD_TIMESTAMP -> {new_timestamp}")

    if args.dry_run:
        for target_path in TARGET_FILES:
            if not target_path.exists():
                print(f"SKIP (missing): {target_path.name}")
                continue
            print(f"WOULD UPDATE: {target_path.name}")
        return 0

    for target_path in TARGET_FILES:
        if not target_path.exists():
            print(f"SKIP (missing): {target_path.name}")
            continue

        content = target_path.read_text(encoding="utf-8")
        if not VERSION_PATTERN.search(content) or not TIMESTAMP_PATTERN.search(content):
            raise RuntimeError(f"Could not find BUILD_VERSION and BUILD_TIMESTAMP constants in {target_path.name}")

        updated = VERSION_PATTERN.sub(f'const BUILD_VERSION = "{new_version}";', content, count=1)
        updated = TIMESTAMP_PATTERN.sub(f'const BUILD_TIMESTAMP = "{new_timestamp}";', updated, count=1)
        target_path.write_text(updated, encoding="utf-8")
        print(f"UPDATED: {target_path.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
