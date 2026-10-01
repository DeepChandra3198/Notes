FROM node:22-slim

# Prisma needs openssl
RUN apt-get update -y && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first so this layer is cached until dependencies change
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

USER node
CMD ["node", "server.js"]