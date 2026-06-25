#!/bin/bash

echo "🚀 California Store - Setup Automatizado"
echo "=========================================="
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js 20+"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"
echo ""

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL não detectado. Certifique-se de ter o PostgreSQL instalado e rodando."
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Copiar .env
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações!"
    echo "   - Configure o DATABASE_URL"
    echo "   - Gere um NEXTAUTH_SECRET com: openssl rand -base64 32"
    echo ""
    read -p "Pressione Enter depois de configurar o .env..."
fi

# Gerar Prisma Client
echo "🔨 Gerando Prisma Client..."
npm run db:generate

# Executar migrations
echo "📊 Executando migrations do banco de dados..."
npm run db:migrate

# Seed do banco
echo "🌱 Populando banco com dados iniciais..."
npm run db:seed

echo ""
echo "✅ Setup concluído com sucesso!"
echo ""
echo "📝 Credenciais de acesso:"
echo "   Email: admin@demo.com"
echo "   Senha: admin123"
echo ""
echo "🚀 Para iniciar o servidor:"
echo "   npm run dev"
echo ""
echo "🌐 Acesse: http://localhost:3000"
