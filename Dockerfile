# Imagen oficial de Node desde Docker Hub
FROM node:22-alpine

# Dependencias de compilacion para modulos nativos (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Instalar dependencias primero para aprovechar la cache de capas
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar el codigo fuente
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

# Usuario no privilegiado para ejecutar la aplicacion
USER node

CMD ["node", "src/index.js"]
