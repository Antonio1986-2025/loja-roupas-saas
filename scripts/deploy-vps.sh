#!/bin/bash

echo "🚀 California Store - Deploy VPS"
echo "=================================="
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado."
    echo "   Instale com: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado."
    echo "   Instale com: sudo apt install docker-compose"
    exit 1
fi

echo "✅ Docker detectado"
echo ""

# Verificar .env
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie .env.example para .env e configure:"
    echo "   cp .env.example .env"
    exit 1
fi

echo "📦 Construindo containers..."
docker-compose build

echo ""
echo "🚀 Iniciando aplicação..."
docker-compose up -d

echo ""
echo "⏳ Aguardando banco de dados..."
sleep 10

echo ""
echo "📊 Executando migrations..."
docker exec californiastore-app npx prisma migrate deploy

echo ""
echo "🌱 Populando banco de dados..."
docker exec californiastore-app npx prisma db seed

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🌐 Aplicação disponível em:"
echo "   http://seu-ip:3000"
echo ""
echo "📊 Verificar logs:"
echo "   docker-compose logs -f app"
echo ""
echo "🛑 Para parar:"
echo "   docker-compose down"
