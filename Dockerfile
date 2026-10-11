# Imagen oficial de Node desde Docker Hub
FROM node:22-alpine

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
