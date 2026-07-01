#!/bin/sh
set -e

# Verificar se DATABASE_URL esta configurada antes de tentar qualquer coisa
if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "================================================================"
  echo "ERRO DE CONFIGURACAO: DATABASE_URL nao esta definida!"
  echo "================================================================"
  echo ""
  echo "Configure a variavel DATABASE_URL nas Environment Variables do"
  echo "seu app no Easypanel (NAO no servico do banco - no APP)."
  echo ""
  echo "Formato esperado:"
  echo "DATABASE_URL=postgresql://usuario:senha@host:5432/banco?sslmode=disable"
  echo ""
  echo "Tambem certifique-se de configurar:"
  echo "  - NEXTAUTH_URL=https://seu-dominio"
  echo "  - NEXTAUTH_SECRET=alguma-chave-secreta"
  echo "  - NODE_ENV=production"
  echo ""
  echo "Apos configurar, faca REBUILD do app."
  echo "================================================================"
  echo ""
  # Sai com erro para o container parar (em vez de loop infinito)
  exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "AVISO: NEXTAUTH_SECRET nao definida - login pode nao funcionar"
fi

echo "=> Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push

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

echo "=> Starting Next.js application..."
node server.js