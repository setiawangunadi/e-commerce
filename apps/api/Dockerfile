# Image produksi untuk API NestJS.
#
# Dibangun dari AKAR REPO, bukan dari apps/api — npm workspaces menaruh
# node_modules di akar, jadi konteks build harus mencakup keduanya:
#
#   docker build -f apps/api/Dockerfile -t toko-api .

ARG NODE_VERSION=22-alpine

# --- Tahap 1: dependency -----------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# argon2 dikompilasi dari source di Alpine, jadi butuh toolchain.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# `npm ci` memakai lockfile apa adanya — build tidak pernah diam-diam
# mengambil versi dependency yang berbeda dari yang sudah diuji.
RUN npm ci --workspace apps/api --include-workspace-root

# --- Tahap 2: build ----------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY apps/api apps/api

# Prisma Client di-generate ke src/generated (lihat schema.prisma), jadi harus
# dijalankan sebelum tsc. Dijalankan dari apps/api karena Prisma 7 mencari
# prisma.config.ts dari direktori kerja.
WORKDIR /app/apps/api
RUN npx prisma generate
WORKDIR /app
RUN npm run build --workspace apps/api

# Membuang dependency khusus development supaya tidak ikut ke image akhir.
RUN npm prune --omit=dev --workspace apps/api --include-workspace-root

# --- Tahap 3: runtime --------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production

# Berjalan sebagai pengguna non-root. Image node sudah menyediakan user `node`.
RUN mkdir -p /app/uploads && chown -R node:node /app

COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/package.json apps/api/package.json

USER node
WORKDIR /app/apps/api

EXPOSE 4000

# Endpoint liveness sengaja tidak menyentuh database: database yang lambat
# tidak boleh memicu restart beruntun.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]
