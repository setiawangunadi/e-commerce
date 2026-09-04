# Image produksi untuk etalase Next.js.
#
# Dibangun dari AKAR REPO:
#   docker build -f apps/web/Dockerfile -t toko-web .
#
# PENTING: variabel NEXT_PUBLIC_* dibaca saat BUILD, bukan saat container
# dijalankan — nilainya ikut ter-inline ke bundel browser. Mengubahnya menuntut
# build ulang image, jadi harus diberikan sebagai build arg di sini.

ARG NODE_VERSION=22-alpine

# --- Tahap 1: dependency -----------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --workspace apps/web --include-workspace-root

# --- Tahap 2: build ----------------------------------------------------------
FROM deps AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_NAMA_TOKO=Nusakara
ARG NEXT_PUBLIC_TAGLINE_TOKO="Perlengkapan harian buatan lokal"
ARG NEXT_PUBLIC_WHATSAPP=6281234567890
ARG NEXT_PUBLIC_MIDTRANS_PRODUKSI=false

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_NAMA_TOKO=$NEXT_PUBLIC_NAMA_TOKO \
    NEXT_PUBLIC_TAGLINE_TOKO=$NEXT_PUBLIC_TAGLINE_TOKO \
    NEXT_PUBLIC_WHATSAPP=$NEXT_PUBLIC_WHATSAPP \
    NEXT_PUBLIC_MIDTRANS_PRODUKSI=$NEXT_PUBLIC_MIDTRANS_PRODUKSI \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY apps/web apps/web

RUN npm run build --workspace apps/web

# --- Tahap 3: runtime --------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Keluaran `output: 'standalone'` sudah memuat server beserta dependency yang
# benar-benar dipakai, jadi node_modules lengkap tidak perlu ikut.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public apps/web/public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
