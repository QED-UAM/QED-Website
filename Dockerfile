# syntax=docker/dockerfile:1

# ---- build -------------------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime -----------------------------------------------------------------------------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

# Healthy only when MongoDB is reachable (see src/pages/endpoints/health.ts).
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
    CMD wget -q --spider "http://127.0.0.1:${PORT}/endpoints/health" || exit 1

CMD ["node", "dist/server/entry.mjs"]
