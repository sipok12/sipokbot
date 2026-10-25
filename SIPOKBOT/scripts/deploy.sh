#!/usr/bin/env bash
# Déploiement / mise à jour depuis votre poste (Linux, macOS, WSL ou Git Bash avec rsync) :
#   ./scripts/deploy.sh utilisateur@IP [/opt/sipokbot]
# Les données (session WhatsApp, config.json) et le .env du serveur ne sont jamais écrasés.
set -euo pipefail

TARGET="${1:?Usage : $0 utilisateur@hote [dossier-distant]}"
REMOTE_DIR="${2:-/opt/sipokbot}"
cd "$(dirname "$0")/.."

echo "==> Envoi du code vers $TARGET:$REMOTE_DIR"
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .env --exclude data \
  --exclude backups --exclude 'auth_info*' --exclude '*.log' \
  ./ "$TARGET:$REMOTE_DIR/"

# Premier déploiement : envoie le .env local s'il n'existe pas encore sur le serveur.
if ! ssh "$TARGET" "test -f '$REMOTE_DIR/.env'"; then
  if [ -f .env ]; then
    echo "==> Premier déploiement : envoi du .env local"
    scp .env "$TARGET:$REMOTE_DIR/.env"
    ssh "$TARGET" "chmod 600 '$REMOTE_DIR/.env'"
  else
    echo "ERREUR : pas de .env sur le serveur ni en local."
    echo "Créez-le : ssh $TARGET, puis cp $REMOTE_DIR/.env.example $REMOTE_DIR/.env && nano $REMOTE_DIR/.env"
    exit 1
  fi
fi

echo "==> Construction et démarrage"
ssh "$TARGET" "cd '$REMOTE_DIR' && mkdir -p data && docker compose up -d --build && docker image prune -f >/dev/null && docker compose ps"

echo
echo "Terminé. Suivre les journaux (code d'association / QR au premier lancement) :"
echo "  ssh $TARGET 'cd $REMOTE_DIR && docker compose logs -f --tail=50'"
