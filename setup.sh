#!/bin/bash
set -e

echo ""
echo "================================================"
echo "   Cemevi Vereinssoftware - Setup"
echo "================================================"
echo ""

# Docker kontrolu
if ! command -v docker &> /dev/null; then
  echo "Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Bilgi al
read -p "Domain adresiniz (orn: cemevi-koeln.de): " DOMAIN
if [ -z "$DOMAIN" ]; then echo "Domain gerekli!"; exit 1; fi

DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 28)
SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)

# .env olustur
cat > .env << ENV
DATABASE_URL=postgresql://cemevi:${DB_PASS}@db:5432/cemevi
NEXTAUTH_SECRET=${SECRET}
NEXTAUTH_URL=https://${DOMAIN}
POSTGRES_PASSWORD=${DB_PASS}
ENV

# Caddyfile olustur
cat > Caddyfile << CADDY
${DOMAIN} {
    reverse_proxy app:3000
}
CADDY

echo ""
echo "Uygulama baslatiliyor (ilk seferde 3-5 dk surebilir)..."
docker compose up -d --build

echo "Veritabani hazir olana kadar bekleniyor..."
sleep 15

echo "Veritabani migrasyonu yapiliyor..."
docker compose exec app npx prisma migrate deploy

echo ""
echo "================================================"
echo "   KURULUM TAMAMLANDI!"
echo "   Tarayicida acin: https://${DOMAIN}/setup"
echo "   Verein bilgilerinizi ve admin hesabinizi girin."
echo "================================================"
echo ""
