# Multi-stage Dockerfile for WhatsApp Baileys Bridge
FROM node:20-alpine AS runner

RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=48291

RUN mkdir -p /app/data

EXPOSE 48291

CMD ["npx", "tsx", "src/index.ts"]
