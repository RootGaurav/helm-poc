# ─────────────────────────────────────────────────────────────
# Stage 1 : BUILD
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Layer cache: reinstall only when package.json changes
COPY package*.json ./
RUN npm ci

COPY src ./src

# ─────────────────────────────────────────────────────────────
# Stage 2 : RUN  (no devDependencies)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/src ./src
COPY package*.json ./
RUN npm ci --only=production

RUN chown -R appuser:appgroup /app
USER appuser

# Matches service.container_port in Helm values (same as frontend-web -> 3000)
EXPOSE 3000

CMD ["node", "src/index.js"]
