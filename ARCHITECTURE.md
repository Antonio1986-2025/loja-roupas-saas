# Arquitetura - California Store SaaS

## Visão Geral

Sistema ERP SaaS multi-tenant para gestão completa de lojas de roupas, construído com arquitetura moderna e escalável.

## Stack Tecnológica

### Frontend
- **Next.js 14** (App Router) - Framework React com SSR/SSG
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Componentes React reutilizáveis
- **Lucide Icons** - Ícones modernos

### Backend
- **Next.js API Routes** - Backend integrado
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Banco de dados relacional
- **NextAuth.js** - Autenticação e autorização

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração local
- **Nginx** - Reverse proxy (produção)

## Arquitetura Multi-Tenant

### Modelo: Database-per-Schema (Row-Level)

Cada tenant (loja) possui dados isolados na mesma database através de:

1. **Coluna `tenantId`** em todas as tabelas principais
2. **Middleware Prisma** para filtrar automaticamente por tenant
3. **Session Context** para identificar tenant do usuário logado

### Fluxo de Autenticação

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Cliente │ ───> │  Login   │ ───> │NextAuth.js│ ───> │ Session  │
└─────────┘      └──────────┘      └──────────┘      └──────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │   JWT    │
                                    │ (tenant) │
                                    └──────────┘
```

### Isolamento de Dados

```typescript
// Middleware automático em queries
const produtos = await prisma.produto.findMany({
  where: {
    tenantId: session.user.tenantId, // Sempre filtrado
  },
});
```

## Estrutura de Pastas

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Rotas autenticadas (layout group)
│   │   ├── dashboard/           # Dashboard principal
│   │   ├── produtos/            # Gestão de produtos
│   │   ├── clientes/            # Gestão de clientes
│   │   ├── vendas/              # Histórico de vendas
│   │   ├── estoque/             # Controle de estoque
│   │   ├── pdv/                 # Ponto de Venda
│   │   ├── consignacao/         # Vendas condicionais
│   │   ├── fornecedores/        # Cadastro de fornecedores
│   │   ├── funcionarios/        # Gestão de equipe
│   │   ├── relatorios/          # Relatórios e análises
│   │   └── configuracoes/       # Configurações da loja
│   ├── auth/                    # Páginas de autenticação
│   │   ├── login/              
│   │   └── error/              
│   ├── api/                     # API Routes
│   │   └── auth/               # NextAuth endpoints
│   └── layout.tsx              # Root layout
│
├── components/                  # Componentes React
│   ├── layout/                 # Layout components
│   │   ├── sidebar.tsx        # Navegação lateral
│   │   └── header.tsx         # Cabeçalho
│   └── ui/                    # UI primitives (shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
│
├── lib/                        # Bibliotecas e utils
│   ├── prisma.ts              # Prisma client
│   ├── auth.ts                # NextAuth config
│   └── utils.ts               # Funções auxiliares
│
└── types/                     # TypeScript types
    └── next-auth.d.ts        # Type augmentation
```

## Modelo de Dados

### Entidades Principais

```
Tenant (Loja)
├── Users (Usuários)
├── Produtos
│   ├── Categoria
│   ├── Fornecedor
│   └── Variantes
│       ├── Cor
│       ├── Tamanho
│       └── Estoque
├── Clientes
├── Funcionários
├── Vendas
│   └── Itens
├── Consignações
│   └── Itens
├── Notas Fiscais
└── Configurações
```

### Relacionamentos

- **1:N** - Tenant → Produtos, Clientes, Vendas
- **1:N** - Produto → Variantes
- **1:N** - Venda → Itens
- **N:1** - Produto → Categoria
- **N:1** - Produto → Fornecedor

## Segurança

### Autenticação
- **JWT Tokens** via NextAuth.js
- **Session-based** com cookie seguro
- **Password hashing** com bcrypt (10 rounds)

### Autorização
- **Role-based** (ADMIN, MANAGER, USER)
- **Tenant isolation** via middleware
- **API protection** via middleware do Next.js

### Best Practices
- Variáveis de ambiente para secrets
- HTTPS obrigatório em produção
- Rate limiting (a implementar)
- SQL Injection prevention (Prisma)
- XSS prevention (React)

## Performance

### Otimizações
- **Static Generation** para páginas públicas
- **Server Components** por padrão
- **Incremental Static Regeneration** quando aplicável
- **Database indexes** em colunas filtradas
- **Connection pooling** via Prisma

### Caching Strategy
- Next.js automatic caching
- Database query caching (Prisma)
- CDN para assets estáticos

## Escalabilidade

### Horizontal Scaling
```
                    ┌─────────────┐
                    │   Nginx     │
                    │Load Balancer│
                    └─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐      ┌─────────┐
   │  App 1  │       │  App 2  │      │  App 3  │
   └─────────┘       └─────────┘      └─────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │   (Master)   │
                  └──────────────┘
```

### Vertical Scaling
- Aumentar recursos do container
- Otimizar queries do banco
- Implementar caching Redis

## Monitoramento

### Métricas Importantes
- Response time
- Database query time
- Error rate
- Active users
- Storage usage

### Ferramentas Recomendadas
- **Logs**: Winston ou Pino
- **APM**: New Relic ou DataDog
- **Uptime**: UptimeRobot
- **Analytics**: Plausible ou Umami

## Deploy

### Ambientes

1. **Development**
   - `npm run dev`
   - Hot reload
   - Debug enabled

2. **Staging**
   - Docker Compose
   - Dados de teste
   - Preview de features

3. **Production**
   - Docker + Kubernetes (opcional)
   - Load balancer
   - Auto-scaling
   - Backup automático

### CI/CD Pipeline

```
Git Push → Build → Test → Docker Image → Deploy → Health Check
```

## Roadmap Técnico

### Fase 1 (MVP) ✅
- [x] Autenticação multi-tenant
- [x] CRUD básico de produtos
- [x] Controle de estoque
- [x] Vendas básicas
- [x] Dashboard com métricas

### Fase 2
- [ ] PDV completo com busca por código
- [ ] Geração de etiquetas/códigos de barras
- [ ] Impressão de cupom fiscal
- [ ] Sistema de permissões granular
- [ ] Relatórios avançados com gráficos

### Fase 3
- [ ] Integração com gateway de pagamento
- [ ] Emissão de NF-e
- [ ] App mobile (React Native)
- [ ] Integração com marketplace
- [ ] WhatsApp API para notificações

### Fase 4
- [ ] BI e Analytics avançado
- [ ] Machine Learning para previsão de vendas
- [ ] Multi-loja por tenant
- [ ] API pública para integrações
- [ ] White-label para revendedores

## Manutenção

### Backup
- Database: Backup diário automático
- Arquivos: Storage em S3 ou similar
- Retention: 30 dias

### Updates
- Dependências: Mensal
- Security patches: Imediato
- Major versions: Planejado

## Custos Estimados (Mensal)

### Infraestrutura Base
- **VPS** (2vCPU, 4GB RAM): $20-40
- **Database** (managed): $25-50
- **Storage**: $5-10
- **CDN/Cache**: $10-20
- **Backup**: $5-10

**Total**: ~$65-130/mês para suportar 50-100 lojas

### Escalado (1000 lojas)
- Load Balancer + VPS cluster: $200-400
- Database (replica): $100-200
- Redis Cache: $30-50
- Monitoramento: $50-100

**Total**: ~$380-750/mês
