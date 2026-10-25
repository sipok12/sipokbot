FROM node:22-slim

ENV NODE_ENV=production \
    DATA_DIR=/data \
    TZ=Africa/Lome

WORKDIR /app

# Dépendances d'abord (cache Docker), versions exactes du package-lock.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.js lib.js config.default.json ./

# Dossier de données persistant (session WhatsApp + config.json), propriété de l'utilisateur "node"
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
