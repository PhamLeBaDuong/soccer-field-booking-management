# ── Soccer booking frontend (Next.js) ─────────────────────────────────
# Multi-stage build → small "standalone" runtime image.
# Build context is ./client; the Next.js app lives in ./client/web.
#   docker build -t soccer-web ./client
#
# Requires `output: "standalone"` in client/web/next.config.ts.

# 1. Install dependencies (this layer is cached until the lockfile changes)
FROM node:20-slim AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

# 2. Build the production bundle
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./

# NEXT_PUBLIC_* values are inlined into the BROWSER bundle at BUILD time,
# so the API URL must be supplied here — NOT at runtime. Point it at the
# URL the user's browser will hit (e.g. https://api.yourdomain.com).
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 3. Minimal runtime image — only the standalone server + static assets
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Listen on all interfaces so the container is reachable from outside.
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
