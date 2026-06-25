#!/bin/sh
set -e

echo "=> Running database migrations..."
npx prisma@5.22.0 db push --accept-data-loss

echo "=> Starting application..."
node server.js