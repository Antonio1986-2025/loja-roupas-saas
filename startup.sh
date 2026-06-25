#!/bin/sh
set -e

echo "=> Running database migrations..."
npx prisma@5.22.0 db push --accept-data-loss --skip-generate

echo "=> Checking if database needs seeding..."

# Tentar contar usuarios. Se falhar ou retornar 0, roda seed.
# Usamos node + prisma client (ja disponivel no container) para checar
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(c => { console.log(c === 0 ? 'yes' : 'no'); return p.\$disconnect(); })
  .catch(() => { console.log('yes'); });
" 2>/dev/null)

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "Database is empty. Running seed..."
  node prisma/seed.js || echo "WARNING: Seed failed, but continuing..."
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