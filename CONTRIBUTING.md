# Guia de Contribuição - California Store

## Padrões de Código

### TypeScript

✅ **Boas Práticas:**

```typescript
// Use tipos explícitos
function calcularTotal(preco: number, quantidade: number): number {
  return preco * quantidade;
}

// Use interfaces para objetos complexos
interface Produto {
  id: string;
  nome: string;
  preco: number;
}

// Use enum para valores fixos
enum StatusVenda {
  PENDENTE = "PENDENTE",
  CONCLUIDA = "CONCLUIDA",
  CANCELADA = "CANCELADA",
}
```

❌ **Evitar:**

```typescript
// Não use 'any'
function processar(data: any) {} // ❌

// Use tipos específicos
function processar(data: Produto) {} // ✅
```

### React Components

✅ **Server Components (padrão):**

```typescript
// app/(dashboard)/produtos/page.tsx
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

export default async function ProdutosPage() {
  const session = await getServerSession();
  const produtos = await prisma.produto.findMany();
  
  return <div>...</div>;
}
```

✅ **Client Components (quando necessário):**

```typescript
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Prisma Queries

✅ **Sempre incluir tenantId:**

```typescript
// ✅ Correto
const produtos = await prisma.produto.findMany({
  where: {
    tenantId: session.user.tenantId,
  },
});

// ❌ Errado - vaza dados entre tenants
const produtos = await prisma.produto.findMany();
```

✅ **Use select para otimizar:**

```typescript
const produtos = await prisma.produto.findMany({
  where: { tenantId },
  select: {
    id: true,
    nome: true,
    preco: true,
  },
});
```

### Nomenclatura

```typescript
// Componentes: PascalCase
export function ProductCard() {}

// Funções: camelCase
function calculateTotal() {}

// Constantes: UPPER_SNAKE_CASE
const MAX_ITEMS = 100;

// Arquivos de componentes: kebab-case.tsx
// product-card.tsx
// user-profile.tsx

// Páginas: page.tsx dentro de pasta
// app/(dashboard)/produtos/page.tsx
```

## Estrutura de Componentes

### Organização

```
components/
├── layout/           # Layout específico
│   ├── sidebar.tsx
│   └── header.tsx
├── ui/              # Componentes UI básicos
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
├── forms/           # Formulários específicos
│   ├── produto-form.tsx
│   └── cliente-form.tsx
└── shared/          # Componentes compartilhados
    ├── loading.tsx
    └── error.tsx
```

### Template de Componente

```typescript
import { cn } from "@/lib/utils";

interface MyComponentProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function MyComponent({
  title,
  description,
  className,
  children,
}: MyComponentProps) {
  return (
    <div className={cn("base-classes", className)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
```

## Páginas (Routes)

### Server Component (padrão)

```typescript
// app/(dashboard)/produtos/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

// Função auxiliar para buscar dados
async function getProdutos(tenantId: string) {
  return await prisma.produto.findMany({
    where: { tenantId },
    include: { categoria: true },
  });
}

// Página
export default async function ProdutosPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/auth/login");
  }

  const produtos = await getProdutos(session.user.tenantId);

  return (
    <div>
      <h1>Produtos</h1>
      {/* Renderizar produtos */}
    </div>
  );
}
```

## Formulários

### Com React Hook Form + Zod

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  preco: z.number().positive("Preço deve ser positivo"),
});

type FormData = z.infer<typeof schema>;

export function ProdutoForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Enviar para API
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Campos */}
    </form>
  );
}
```

## API Routes

```typescript
// app/api/produtos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const produtos = await prisma.produto.findMany({
    where: { tenantId: session.user.tenantId },
  });

  return NextResponse.json(produtos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  
  // Validar body aqui
  
  const produto = await prisma.produto.create({
    data: {
      ...body,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(produto, { status: 201 });
}
```

## Migrations

### Criar Migration

```bash
npx prisma migrate dev --name add_campo_produto
```

### Boas Práticas

1. **Nome descritivo**: `add_campo_produto`, `create_table_vendas`
2. **Pequenas e focadas**: Uma mudança por migration
3. **Reversíveis**: Sempre pensar no rollback
4. **Testar**: Executar em dev antes de produção

## Testes (a implementar)

### Unit Tests

```typescript
// __tests__/utils.test.ts
import { formatCurrency } from "@/lib/utils";

describe("formatCurrency", () => {
  it("should format number to BRL currency", () => {
    expect(formatCurrency(100)).toBe("R$ 100,00");
  });
});
```

### Integration Tests

```typescript
// __tests__/api/produtos.test.ts
import { GET } from "@/app/api/produtos/route";

describe("/api/produtos", () => {
  it("should return 401 without auth", async () => {
    const response = await GET(new Request("http://localhost/api/produtos"));
    expect(response.status).toBe(401);
  });
});
```

## Git Workflow

### Commits

Padrão Conventional Commits:

```bash
feat: adiciona página de relatórios
fix: corrige cálculo de estoque
docs: atualiza README
style: formata código com prettier
refactor: reorganiza componentes
test: adiciona testes de produto
chore: atualiza dependências
```

### Branches

```
main           # Produção
├── develop    # Desenvolvimento
    ├── feature/nome-feature
    ├── fix/nome-bug
    └── hotfix/nome-hotfix
```

### Pull Request

1. Criar branch a partir de `develop`
2. Fazer commits descritivos
3. Abrir PR para `develop`
4. Aguardar code review
5. Merge após aprovação

## Code Review Checklist

- [ ] Código segue padrões do projeto
- [ ] Não há código comentado
- [ ] Variáveis e funções têm nomes descritivos
- [ ] Todas as queries incluem `tenantId`
- [ ] Não há console.log esquecido
- [ ] Types/interfaces estão corretos
- [ ] Componentes são reutilizáveis quando possível
- [ ] Performance foi considerada
- [ ] Tratamento de erros está presente
- [ ] UI é responsiva

## Performance

### Otimizações

```typescript
// ✅ Use React.memo para evitar re-renders
export const ProductCard = React.memo(({ produto }: Props) => {
  return <div>{produto.nome}</div>;
});

// ✅ Use useMemo para cálculos pesados
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.preco, 0);
}, [items]);

// ✅ Use useCallback para funções em props
const handleClick = useCallback(() => {
  console.log("clicked");
}, []);
```

### Database

```typescript
// ✅ Use select para reduzir dados
const produtos = await prisma.produto.findMany({
  select: { id: true, nome: true },
});

// ✅ Use include com cuidado
const produtos = await prisma.produto.findMany({
  include: {
    categoria: true, // Apenas o necessário
  },
});

// ✅ Use pagination
const produtos = await prisma.produto.findMany({
  take: 20,
  skip: page * 20,
});
```

## Segurança

### Checklist

- [ ] Nunca expor secrets no código
- [ ] Sempre validar input do usuário
- [ ] Sempre incluir `tenantId` em queries
- [ ] Usar HTTPS em produção
- [ ] Sanitizar dados antes de salvar
- [ ] Implementar rate limiting em APIs públicas
- [ ] Logs não devem conter dados sensíveis

## Dúvidas?

Abra uma issue ou entre em contato com a equipe!
