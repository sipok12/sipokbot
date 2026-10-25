#!/usr/bin/env bash
# Sauvegarde de data/ (session WhatsApp + config.json). À lancer depuis le dossier du projet.
# L'archive contient les clés de session : droits 600, ne la publiez jamais.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
chmod 700 backups
FILE="backups/sipokbot-data-$(date +%Y%m%d-%H%M%S).tar.gz"
( umask 077; tar -czf "$FILE" data )
# Garde les 7 plus récentes
ls -1t backups/sipokbot-data-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
echo "$(date -Is) sauvegarde : $FILE"
