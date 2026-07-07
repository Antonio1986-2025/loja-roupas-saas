-- Criação das tabelas de Orçamento
-- Executar diretamente no banco Railway

-- 1. Enum de status
DO $$ BEGIN
  CREATE TYPE "StatusOrcamento" AS ENUM ('ABERTO', 'CONVERTIDO', 'CANCELADO', 'EXPIRADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de orçamentos (cabeçalho)
CREATE TABLE IF NOT EXISTS "orcamentos" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "numero"         INTEGER NOT NULL,
  "clienteId"      TEXT,
  "vendedorId"     TEXT NOT NULL,
  "status"         "StatusOrcamento" NOT NULL DEFAULT 'ABERTO',
  "validadeDias"   INTEGER NOT NULL DEFAULT 7,
  "dataValidade"   TIMESTAMP(3) NOT NULL,
  "subtotal"       DECIMAL(10,2) NOT NULL,
  "desconto"       DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total"          DECIMAL(10,2) NOT NULL,
  "formaPagamento" "FormaPagamento",
  "observacoes"    TEXT,
  "vendaId"        TEXT UNIQUE,
  "tenantId"       TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- 3. Tabela de itens do orçamento
CREATE TABLE IF NOT EXISTS "orcamento_itens" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "orcamentoId" TEXT NOT NULL,
  "varianteId"  TEXT NOT NULL,
  "quantidade"  INTEGER NOT NULL,
  "precoUnit"   DECIMAL(10,2) NOT NULL,
  "desconto"    DECIMAL(10,2) NOT NULL DEFAULT 0,
  "subtotal"    DECIMAL(10,2) NOT NULL,

  CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id")
);

-- 4. Índices e constraints
CREATE UNIQUE INDEX IF NOT EXISTS "orcamentos_tenantId_numero_key" ON "orcamentos"("tenantId", "numero");
CREATE INDEX IF NOT EXISTS "orcamentos_tenantId_idx"     ON "orcamentos"("tenantId");
CREATE INDEX IF NOT EXISTS "orcamentos_clienteId_idx"    ON "orcamentos"("clienteId");
CREATE INDEX IF NOT EXISTS "orcamentos_status_idx"       ON "orcamentos"("status");
CREATE INDEX IF NOT EXISTS "orcamentos_dataValidade_idx" ON "orcamentos"("dataValidade");

CREATE INDEX IF NOT EXISTS "orcamento_itens_orcamentoId_idx" ON "orcamento_itens"("orcamentoId");
CREATE INDEX IF NOT EXISTS "orcamento_itens_varianteId_idx"  ON "orcamento_itens"("varianteId");

-- 5. Foreign keys
ALTER TABLE "orcamentos"
  ADD CONSTRAINT IF NOT EXISTS "orcamentos_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "orcamentos_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS "orcamentos_vendedorId_fkey"
    FOREIGN KEY ("vendedorId") REFERENCES "users"("id"),
  ADD CONSTRAINT IF NOT EXISTS "orcamentos_vendaId_fkey"
    FOREIGN KEY ("vendaId") REFERENCES "vendas"("id");

ALTER TABLE "orcamento_itens"
  ADD CONSTRAINT IF NOT EXISTS "orcamento_itens_orcamentoId_fkey"
    FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "orcamento_itens_varianteId_fkey"
    FOREIGN KEY ("varianteId") REFERENCES "produto_variantes"("id");

-- 6. updatedAt automático via trigger
CREATE OR REPLACE FUNCTION update_orcamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orcamentos_updated_at ON "orcamentos";
CREATE TRIGGER trg_orcamentos_updated_at
  BEFORE UPDATE ON "orcamentos"
  FOR EACH ROW EXECUTE FUNCTION update_orcamentos_updated_at();
