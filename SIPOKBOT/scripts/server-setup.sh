#!/usr/bin/env bash
# Préparation d'un VPS Ubuntu/Debian neuf. À lancer UNE fois, en root ou avec sudo :
#   sudo bash server-setup.sh [dossier-d-installation]
set -euo pipefail

APP_DIR="${1:-/opt/sipokbot}"
APP_USER="${SUDO_USER:-root}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Installation de Docker (script officiel get.docker.com)..."
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

if [ "$APP_USER" != "root" ]; then
  usermod -aG docker "$APP_USER"
fi

mkdir -p "$APP_DIR/data" "$APP_DIR/backups"
# Le conteneur tourne avec l'utilisateur "node" (uid 1000)
chown -R 1000:1000 "$APP_DIR/data"
chown "$APP_USER":"$APP_USER" "$APP_DIR" "$APP_DIR/backups" 2>/dev/null || true

# Pare-feu : seul SSH est ouvert (le bot n'a aucun port entrant).
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null
  ufw --force enable >/dev/null
fi

# Sauvegarde quotidienne à 03:30 (garde 7 jours)
CRON_LINE="30 3 * * * cd $APP_DIR && bash scripts/backup.sh >> backups/backup.log 2>&1"
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v 'scripts/backup.sh' || true; echo "$CRON_LINE" ) | crontab -u "$APP_USER" -

echo
echo "Serveur prêt dans $APP_DIR."
echo "Étape suivante, depuis votre poste : ./scripts/deploy.sh $APP_USER@IP_DU_SERVEUR $APP_DIR"
echo "(reconnectez-vous en SSH une fois pour que le groupe docker soit pris en compte)"
