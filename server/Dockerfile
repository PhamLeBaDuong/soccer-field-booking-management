# ── Soccer booking API ────────────────────────────────────────────────
# Debian "slim" (not alpine): Prisma + bcrypt native binaries work without
# extra build tooling.
FROM node:20-slim

# Prisma needs OpenSSL present at runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY . .

# Generate the Prisma client (schema lives under src/prisma)
RUN npx prisma generate --schema=src/prisma/schema.prisma

ENV NODE_ENV=production
EXPOSE 5000

# On boot: sync the schema to the database, then start the server.
# `db push` is used instead of `migrate deploy` because the committed
# migrations are behind the current schema (social tables added later).
CMD ["sh", "-c", "npx prisma db push --schema=src/prisma/schema.prisma && node src/index.js"]
