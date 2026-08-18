#!/bin/sh
set -eu

: "${VPIC_DATABASE_URL:?Set VPIC_DATABASE_URL to a private local PostgreSQL 17 database URL}"

VPIC_RELEASE="${VPIC_RELEASE:-2026_08}"
VPIC_WORK="$(mktemp -d)"
trap 'rm -rf "$VPIC_WORK"' EXIT INT TERM

curl -fsSL "https://vpic.nhtsa.dot.gov/downloads/vPICList_lite_${VPIC_RELEASE}.custom.zip" -o "$VPIC_WORK/vpic.zip"
unzip -q "$VPIC_WORK/vpic.zip" -d "$VPIC_WORK"
VPIC_BACKUP="$(find "$VPIC_WORK" -type f -name '*.custom' -print -quit)"
test -n "$VPIC_BACKUP"
pg_restore --dbname "$VPIC_DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$VPIC_BACKUP"
printf '%s\n' "Installed NHTSA vPIC standalone database release $VPIC_RELEASE"
