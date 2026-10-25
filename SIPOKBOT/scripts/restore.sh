#!/usr/bin/env bash
# Restauration : ./scripts/restore.sh backups/sipokbot-data-AAAAMMJJ-HHMMSS.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."
ARCHIVE="${1:?Usage : $0 archive.tar.gz}"

docker compose down
rm -rf data.avant-restauration
[ -d data ] && mv data data.avant-restauration
tar -xzf "$ARCHIVE"
chown -R 1000:1000 data 2>/dev/null || sudo chown -R 1000:1000 data
docker compose up -d
echo "Restauration terminée (ancien dossier conservé : data.avant-restauration)."
