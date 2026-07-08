-- Migration: Adicionar qtdParcelas ao VendaPagamento
ALTER TABLE "venda_pagamentos" ADD COLUMN "qtdParcelas" INTEGER NOT NULL DEFAULT 1;
