# Multi-stage build for minimal production image

# ---- Stage 1: deps ----
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2: builder ----
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set a build-time placeholder; real path is set at runtime via env
ENV DATABASE_PATH=/data/fatbearweek.db
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage 3: runner ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/fatbearweek.db
ENV UPLOADS_DIR=/data/uploads

# The standalone output includes only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Data volume — holds both the SQLite database and uploaded bear photos
RUN mkdir -p /data/uploads
VOLUME ["/data"]

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Uses Node's built-in fetch (Node 18+) so no curl/wget needs installing into
# the slim image. Exits non-zero on a bad/failed response, which flips the
# container to "unhealthy" so Docker/Pangolin can act on it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
