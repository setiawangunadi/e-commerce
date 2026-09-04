#!/usr/bin/env bash
#
# Membuka URL publik sementara ke API lokal, supaya webhook Midtrans bisa
# menjangkau http://localhost:4000 dari internet.
#
# Tanpa ini, status pesanan tidak akan pernah berubah jadi LUNAS otomatis:
# Midtrans mengirim notifikasi pembayaran ke server, bukan ke browser pembeli.
#
# Pakai: npm run tunnel
set -euo pipefail

PORT="${PORT:-4000}"
PATH_WEBHOOK="/api/v1/pembayaran/midtrans/notifikasi"

if ! command -v ngrok >/dev/null 2>&1 && ! command -v cloudflared >/dev/null 2>&1; then
  cat <<'PESAN'
Belum ada tunnel yang terpasang. Pasang salah satu:

  brew install ngrok        # butuh akun gratis + `ngrok config add-authtoken <token>`
  brew install cloudflared  # tanpa akun

PESAN
  exit 1
fi

echo "Membuka tunnel ke http://localhost:${PORT} ..."
echo

if command -v cloudflared >/dev/null 2>&1; then
  # cloudflared mencetak URL-nya ke stderr, jadi digabung dulu ke stdout.
  cloudflared tunnel --url "http://localhost:${PORT}" 2>&1 | while IFS= read -r baris; do
    echo "$baris"
    if [[ "$baris" =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
      URL="${BASH_REMATCH[1]}"
      printf '\n%s\n' "────────────────────────────────────────────────────────────"
      printf 'Tempel URL ini di dashboard Midtrans:\n'
      printf '  Settings → Configuration → Payment Notification URL\n\n'
      printf '  %s%s\n' "$URL" "$PATH_WEBHOOK"
      printf '%s\n\n' "────────────────────────────────────────────────────────────"
    fi
  done
  exit 0
fi

# --- ngrok ---
ngrok http "${PORT}" --log=stdout > /tmp/ngrok-webhook.log 2>&1 &
NGROK_PID=$!
trap 'kill "$NGROK_PID" 2>/dev/null || true' EXIT

# ngrok mengekspos URL aktifnya lewat API lokal di port 4040.
URL=""
for _ in $(seq 1 30); do
  URL=$(curl -s --max-time 2 http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | node -pe 'try{const t=JSON.parse(require("fs").readFileSync(0)).tunnels||[];(t.find(x=>x.proto==="https")||{}).public_url||""}catch(e){""}' 2>/dev/null || true)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Gagal membaca URL ngrok. Cek /tmp/ngrok-webhook.log"
  exit 1
fi

printf '\n%s\n' "────────────────────────────────────────────────────────────"
printf 'Tempel URL ini di dashboard Midtrans:\n'
printf '  Settings → Configuration → Payment Notification URL\n\n'
printf '  %s%s\n\n' "$URL" "$PATH_WEBHOOK"
printf 'Biarkan terminal ini terbuka selama pengujian.\n'
printf 'URL berubah setiap kali tunnel dijalankan ulang.\n'
printf '%s\n\n' "────────────────────────────────────────────────────────────"

wait "$NGROK_PID"
