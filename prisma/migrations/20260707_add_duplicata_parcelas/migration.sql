-- Migration: add_duplicata_parcelas
-- Adiciona DUPLICATA como forma de pagamento e campo qtdParcelas nas vendas

-- Adicionar DUPLICATA ao enum FormaPagamento
ALTER TYPE "FormaPagamento" ADD VALUE IF NOT EXISTS 'DUPLICATA';

-- Adicionar campo qtdParcelas na tabela vendas (default 1 = à vista)
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "qtdParcelas" INTEGER DEFAULT 1;
