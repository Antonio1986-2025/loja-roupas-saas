#!/bin/sh
set -e

echo "=> Generating Prisma Client for this environment..."
npx prisma@5.22.0 generate

echo "=> Running database migrations..."
npx prisma@5.22.0 db push --accept-data-loss --skip-generate

echo "=> Starting application..."
node server.js