-- Migration: adicionar campos de trial e assinatura no tenant
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "trialEndsAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assinaturaAte" TIMESTAMP(3);