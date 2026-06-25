# 🏪 California Store - SaaS ERP para Lojas de Roupas

> Sistema completo e profissional de gestão (ERP) multi-tenant para lojas de roupas, pronto para comercialização.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-brightgreen)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-Proprietário-red)](./LICENSE)

---

## ⚡ Início Rápido

```bash
# Clone o repositório
git clone <seu-repositorio>
cd californiastore-saas

# Execute o setup automático
chmod +x scripts/setup.sh
./scripts/setup.sh

# Inicie o servidor
npm run dev
```

Acesse: **http://localhost:3000**

**Credenciais padrão:**
- Email: `admin@demo.com`
- Senha: `admin123`

📖 **[Guia Completo de Instalação](./QUICKSTART.md)**

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para PostgreSQL
- **NextAuth.js** - Autenticação
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **PostgreSQL** - Banco de dados
- **Docker** - Containerização

## 📋 Funcionalidades

### ✅ Implementado

- 🔐 Sistema de autenticação multi-tenant
- 🏢 Gestão de tenants (lojas)
- 📊 Dashboard com métricas em tempo real
- 📦 Cadastro de produtos com variantes (cor/tamanho)
- 📂 Categorização de produtos
- 👥 Gestão de clientes
- 🏪 Cadastro de fornecedores
- 👨‍💼 Gestão de funcionários
- 💰 Módulo de vendas (PDV)
- 📋 Sistema de consignação
- 📊 Controle de estoque
- 📄 Notas fiscais
- ⚙️ Configurações da loja

### 🎨 Design

- Interface moderna e profissional
- Totalmente responsivo
- Sidebar com navegação intuitiva
- Cards e métricas visuais
- Alertas e notificações

## 🛠️ Instalação

### Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- npm ou yarn

### Instalação Local

1. **Clone o repositório**

```bash
cd californiastore-saas
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/californiastore"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

4. **Configure o banco de dados**

```bash
# Gerar cliente Prisma
npm run db:generate

# Executar migrações
npm run db:migrate

# Popular com dados de exemplo
npm run db:seed
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

Acesse: http://localhost:3000

### Credenciais de Teste

Após executar o seed:

- **Email:** admin@demo.com
- **Senha:** admin123

## 🐳 Deploy com Docker

### Desenvolvimento

```bash
docker-compose up -d
```

### Produção (VPS)

1. **Clone o repositório no servidor**

```bash
git clone <seu-repositorio>
cd californiastore-saas
```

2. **Configure o .env para produção**

```env
DATABASE_URL="postgresql://california:senha-forte@postgres:5432/californiastore"
NEXTAUTH_URL="https://seu-dominio.com"
NEXTAUTH_SECRET="sua-chave-secreta-forte"
NODE_ENV="production"
```

3. **Suba os containers**

```bash
docker-compose up -d --build
```

4. **Execute as migrações**

```bash
docker exec californiastore-app npx prisma migrate deploy
docker exec californiastore-app npx prisma db seed
```

### Nginx Reverse Proxy (Recomendado)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📁 Estrutura do Projeto

```
californiastore-saas/
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Rotas protegidas
│   │   │   ├── dashboard/
│   │   │   ├── produtos/
│   │   │   ├── clientes/
│   │   │   └── ...
│   │   ├── auth/              # Autenticação
│   │   ├── api/               # API Routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/            # Layout components
│   │   └── ui/                # UI components
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   └── utils.ts           # Utilities
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── public/                    # Static files
├── docker-compose.yml         # Docker config
├── Dockerfile                 # Docker image
└── package.json
```

## 🗄️ Schema do Banco de Dados

### Entidades Principais

- **Tenant** - Lojas (multi-tenant)
- **User** - Usuários do sistema
- **Produto** - Produtos base
- **ProdutoVariante** - Variações (cor, tamanho, estoque)
- **Categoria** - Categorias de produtos
- **Cliente** - Clientes
- **Fornecedor** - Fornecedores
- **Funcionario** - Funcionários
- **Venda** - Vendas realizadas
- **Consignacao** - Vendas condicionais
- **NotaFiscal** - Notas fiscais
- **Configuracao** - Configurações da loja

## 🔒 Segurança

- Autenticação JWT com NextAuth
- Senha criptografada com bcrypt
- Isolamento por tenant (row-level security)
- Middleware de proteção de rotas
- Variáveis de ambiente seguras

## 📊 Planos SaaS

O sistema está preparado para diferentes planos:

- **FREE** - Funcionalidades básicas
- **BASIC** - Mais recursos
- **PRO** - Recursos avançados
- **ENTERPRISE** - Personalizado

## 🤝 Contribuindo

Este é um projeto proprietário para comercialização.

## 📝 Licença

Copyright © 2026 California Store. Todos os direitos reservados.

## 🆘 Suporte

Para suporte técnico:
- Email: suporte@californiastore.com
- Documentação: docs.californiastore.com

---

**Desenvolvido com ❤️ para lojas de roupas**
