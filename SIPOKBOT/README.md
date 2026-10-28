# SIPOKBOT

Assistant WhatsApp pour SIPOKTECK, propulsé par Groq. Fonctionne en local (Windows) ou 24 h/24 sur un VPS avec Docker.

> **Avertissement** : SIPOKBOT utilise Baileys, une bibliothèque **non officielle** qui reproduit WhatsApp Web. Cela peut contrevenir aux conditions de WhatsApp et exposer le numéro à une restriction. Pour un usage commercial critique, migrez vers l'API officielle WhatsApp Business Cloud (voir le plan SipokTech AI avec n8n).

## Sécurité : à faire en premier
- Ne partagez jamais `.env` ni `data/auth_info/` (ils donnent accès à vos clés API et à votre compte WhatsApp). Ils sont exclus par `.gitignore` et `.dockerignore`.
- Créez une clé Groq sur https://console.groq.com/keys et ne la partagez jamais. Si elle a déjà circulé, révoquez-la et créez-en une nouvelle.
- Si le dossier `auth_info` a déjà été partagé : sur le téléphone, WhatsApp > Appareils connectés > déconnectez l'appareil, puis ré-associez.

## Déploiement sur un VPS (recommandé)
Prérequis : un VPS Ubuntu/Debian (1 vCPU, 1 Go de RAM suffisent), un accès SSH. Pas de domaine ni de HTTPS : le bot ne reçoit aucune connexion entrante.

1. **Préparer le serveur (une seule fois)**, depuis votre poste :
   ```bash
   scp scripts/server-setup.sh utilisateur@IP:/tmp/
   ssh utilisateur@IP "sudo bash /tmp/server-setup.sh /opt/sipokbot"
   ```
2. **Configurer** : créez ou complétez `.env` avec `GROQ_API_KEY`, `OWNER_NUMBER` et, pour un serveur sans écran, `PAIRING_NUMBER` (le numéro WhatsApp à lier).
3. **Déployer** (Linux, macOS, WSL ou Git Bash avec rsync) :
   ```bash
   ./scripts/deploy.sh utilisateur@IP /opt/sipokbot
   ```
4. **Associer WhatsApp** (première fois) : `ssh utilisateur@IP 'cd /opt/sipokbot && docker compose logs -f'`. Un code à 8 caractères s'affiche (ou un QR si `PAIRING_NUMBER` est vide). Sur le téléphone : WhatsApp > Appareils connectés > Connecter un appareil > Associer avec un numéro de téléphone. Le message « SIPOKBOT est connecté à WhatsApp » confirme la liaison.
5. **Ne lancez pas le même compte en local en même temps** : WhatsApp coupe l'une des deux sessions.

Les mises à jour suivantes : relancez `./scripts/deploy.sh ...`. La session et `config.json` (dossier `data/`) sont conservés.

### Déploiement automatique (GitHub Actions)
Poussez le projet dans un dépôt **privé**, puis ajoutez dans Settings > Secrets and variables > Actions :
`SSH_PRIVATE_KEY` (clé dédiée au déploiement), `SSH_KNOWN_HOSTS` (résultat de `ssh-keyscan IP`), `SSH_HOST`, `SSH_USER`. Variable facultative : `REMOTE_DIR`.
Chaque `git push` sur `main` lance les tests puis déploie. Le `.env` reste uniquement sur le serveur.

### Exploitation
| Action | Commande (dans `/opt/sipokbot`) |
|---|---|
| Journaux | `docker compose logs -f --tail=100` |
| État | `docker compose ps` ou `curl localhost:3000/health` depuis le conteneur |
| Redémarrer | `docker compose restart` |
| Sauvegarde | `bash scripts/backup.sh` (automatique chaque nuit à 03 h 30, 7 copies) |
| Restauration | `bash scripts/restore.sh backups/<archive>.tar.gz` |

Robustesse intégrée : redémarrage automatique (`restart: unless-stopped`), reconnexion avec délai croissant, redémarrage du processus après 10 min de déconnexion, arrêt propre, journaux limités à 30 Mo, aucun port exposé.

## Utilisation en local (Windows)
1. Node.js 20+ installé. Créez ou complétez `.env` et renseignez `GROQ_API_KEY`.
2. Double-cliquez sur `start.bat` (ou `npm install` puis `npm start`) et scannez le QR.
3. Les données sont dans le dossier `data/`.

## Configuration des contacts (`data/config.json`)
Créé au premier démarrage à partir de `config.default.json`. Numéros : chiffres seulement, avec indicatif, sans `+`.
```json
"22890123456": { "role": "client", "enabled": true, "instructions": "Réponds de manière professionnelle et concise." }
```
- `replyToUnknownContacts` : `true` (défaut) répond à tout le monde ; mettez `false` pour ne répondre qu'aux contacts listés (conseillé si le bot tourne sur votre numéro personnel).
- Groupes : désactivés par défaut. Ajoutez l'identifiant du groupe dans `groupAllowlist`, envoyez `!group on`, puis les messages du groupe doivent commencer par `!ai `.

## Commandes (propriétaire uniquement)
`!bot online` · `!bot offline` · `!bot status` · `!group on` · `!group off`.
`!bot on` et `!bot off` restent disponibles comme alias. Le mode offline met en pause les réponses automatiques sans déconnecter WhatsApp.
Si le bot est lié à votre propre numéro, envoyez-les dans la discussion « Moi » (messages à soi-même).

## Réglages (`.env`)
`GROQ_API_KEY` (obligatoire), `GROQ_MODEL` (`openai/gpt-oss-20b` par défaut), `GROQ_TIMEOUT_MS` (30 000 ms), `MAX_REPLIES_PER_DAY` (300), `MAX_MSG_PER_MINUTE` (8 par contact), `MAX_MESSAGE_AGE_S` (120), `DISCONNECT_RESTART_MIN` (10).

## Corrections apportées à la version initiale
- Numéros avec suffixe d'appareil (`:12`) mal lus, et identifiants `@lid` non reconnus : les consignes par contact et les commandes propriétaire ne s'appliquaient pas.
- `!bot on/off` ne fonctionnait jamais quand `OWNER_NUMBER` était le numéro du compte lié (messages `fromMe` ignorés).
- La génération utilise l'API Groq compatible OpenAI, avec conservation de l'historique de conversation et trois tentatives en cas d'erreurs temporaires.
- Anti-doublon par identifiant de message (et non par texte) ; messages anciens ignorés après une coupure.
- Limites par contact et par jour pour maîtriser les coûts ; écriture atomique de `config.json` ; plus de numéros complets dans les journaux.
- Reconnexion : délai croissant, gestion de la session remplacée, archivage automatique d'une session déconnectée.
- Démarrage : version WhatsApp Web la plus récente, code d'association pour serveur sans écran.

## Limites connues
- L'historique de conversation est en mémoire (perdu au redémarrage) ; les notes vocales et images ne sont pas traitées.
- Les tests automatiques couvrent les fonctions utilitaires (`npm test`). Après avoir configuré `GROQ_API_KEY`, vérifiez l'API avec `npm run test:groq`. La liaison WhatsApp réelle doit être vérifiée en démarrant le bot (`npm start`) et en envoyant un message au compte lié.
