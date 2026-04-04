# Stage 1: Install deps + build
FROM node:20-slim AS builder
WORKDIR /app
COPY openclaw-factory/package.json openclaw-factory/package-lock.json ./
RUN npm ci
COPY openclaw-factory/ .
RUN npm run build

# Stage 2: Production image
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8000
CMD ["node", "dist/server/index.js"]
