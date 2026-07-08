#!/bin/sh
set -e

# =============================================================
# HEALTH CHECK SERVER - roda em background na porta 8080
# Railway usa esta porta para verificar se o container está vivo
# =============================================================
HOSTNAME="${HOSTNAME:-0.0.0.0}"
HEALTH_PORT=8080

# Inicia servidor HTTP mínimo que retorna 200 para QUALQUER request
# Usa netcat (nc) que vem com Alpine
echo "=> Starting health check server on $HOSTNAME:$HEALTH_PORT..."
while true; do
  printf "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK" | nc -l -p $HEALTH_PORT -q 1 2>/dev/null
done &
HEALTH_PID=$!
echo "=> Health check server running (PID: $HEALTH_PID)"

# Verificar se DATABASE_URL esta configurada antes de tentar qualquer coisa
if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "================================================================="
  echo "ERRO DE CONFIGURACAO: DATABASE_URL nao esta definida!"
  echo "================================================================="
  echo ""
  echo "Configure a variavel DATABASE_URL nas Environment Variables do"
  echo "seu app no Easypanel (NAO no servico do banco - no APP)."
  echo ""
  echo "Formato esperado:"
  echo "DATABASE_URL=postgresql://usuario:***@host:5432/banco?sslmode=disable"
  echo ""
  echo "Apos configurar, faca REBUILD do app."
  echo "================================================================="
  echo ""
  exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "AVISO: NEXTAUTH_SECRET nao definida - login pode nao funcionar"
fi

echo "=> Running database migrations..."
npx prisma@5.22.0 migrate deploy 2>/dev/null || npx prisma@5.22.0 db push

echo "=> Checking if database needs seeding..."

# Tentar contar usuarios. Se falhar ou retornar 0, roda seed.
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(c => { console.log(c === 0 ? 'yes' : 'no'); return p.\$disconnect(); })
  .catch(() => { console.log('yes'); });
" 2>/dev/null)

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "Database is empty. Running seed..."
  npx tsx prisma/seed.ts || echo "WARNING: Seed failed, but continuing..."
  echo ""
  echo "========================================"
  echo "DEFAULT CREDENTIALS:"
  echo "  Email: admin@demo.com"
  echo "  Senha: admin123"
  echo "========================================"
  echo ""
else
  echo "Database already has data. Skipping seed."
fi

echo "=> Starting Next.js application on port 3000..."
PORT=3000 node server.js &

NEXT_PID=$!

# Aguarda Next.js ficar pronto
sleep 5
echo "=> Health check: OK (porta $HEALTH_PORT), Next.js rodando (PID: $NEXT_PID)"

# Mantém o processo principal vivo
wait $NEXT_PID
