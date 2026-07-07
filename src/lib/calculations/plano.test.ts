import { describe, it, expect } from "vitest";
import {
  calcularFimTrial,
  diasRestantesTrial,
  calcularStatusAcesso,
  DIAS_TRIAL,
} from "./plano";

const DIA = 1000 * 60 * 60 * 24;

describe("calcularFimTrial", () => {
  it("adiciona 15 dias a partir da data de criacao", () => {
    const criacao = new Date("2026-01-01T00:00:00Z");
    const fim = calcularFimTrial(criacao);
    const diffDias = Math.round((fim.getTime() - criacao.getTime()) / DIA);
    expect(diffDias).toBe(15);
  });

  it("respeita DIAS_TRIAL como padrao", () => {
    const criacao = new Date("2026-01-01T00:00:00Z");
    const fim = calcularFimTrial(criacao);
    const diffDias = Math.round((fim.getTime() - criacao.getTime()) / DIA);
    expect(diffDias).toBe(DIAS_TRIAL);
  });

  it("nao altera a data de criacao original", () => {
    const criacao = new Date("2026-01-10T00:00:00Z");
    const original = criacao.getTime();
    calcularFimTrial(criacao);
    expect(criacao.getTime()).toBe(original);
  });
});

describe("diasRestantesTrial", () => {
  it("retorna positivo quando ainda falta tempo", () => {
    const agora = new Date("2026-01-10T00:00:00Z");
    const fim = new Date("2026-01-20T00:00:00Z");
    expect(diasRestantesTrial(fim, agora)).toBe(10);
  });

  it("retorna zero ou negativo quando venceu", () => {
    const agora = new Date("2026-01-20T00:00:00Z");
    const fim = new Date("2026-01-10T00:00:00Z");
    expect(diasRestantesTrial(fim, agora)).toBeLessThanOrEqual(0);
  });
});

describe("calcularStatusAcesso", () => {
  const agora = new Date("2026-06-25T12:00:00Z");

  const trialFuturo = new Date(agora.getTime() + 10 * DIA);   // 10 dias de trial
  const trialVencendo = new Date(agora.getTime() + 3 * DIA);  // 3 dias (aviso)
  const trialVencido = new Date(agora.getTime() - 1 * DIA);   // ontem
  const assAtiva = new Date(agora.getTime() + 30 * DIA);      // pago por 30 dias
  const assVencida = new Date(agora.getTime() - 1 * DIA);     // vencida ontem

  it("ATIVO dentro do trial (mais de 5 dias restantes)", () => {
    const r = calcularStatusAcesso({ status: "ACTIVE", trialEndsAt: trialFuturo, assinaturaAte: null }, agora);
    expect(r.status).toBe("ATIVO");
    expect(r.emTrial).toBe(true);
    expect(r.bloqueado).toBe(false);
    expect(r.diasRestantesTrial).toBe(10);
  });

  it("TRIAL_VENCENDO quando restam 5 dias ou menos", () => {
    const r = calcularStatusAcesso({ status: "ACTIVE", trialEndsAt: trialVencendo, assinaturaAte: null }, agora);
    expect(r.status).toBe("TRIAL_VENCENDO");
    expect(r.emTrial).toBe(true);
    expect(r.bloqueado).toBe(false);
  });

  it("TRIAL_VENCIDO bloqueia quando trial expirou sem assinatura", () => {
    const r = calcularStatusAcesso({ status: "ACTIVE", trialEndsAt: trialVencido, assinaturaAte: null }, agora);
    expect(r.status).toBe("TRIAL_VENCIDO");
    expect(r.bloqueado).toBe(true);
    expect(r.emTrial).toBe(false);
  });

  it("ATIVO quando assinatura esta em dia (mesmo com trial vencido)", () => {
    const r = calcularStatusAcesso({ status: "ACTIVE", trialEndsAt: trialVencido, assinaturaAte: assAtiva }, agora);
    expect(r.status).toBe("ATIVO");
    expect(r.emTrial).toBe(false);
    expect(r.bloqueado).toBe(false);
  });

  it("TRIAL_VENCIDO quando assinatura venceu e trial tambem", () => {
    const r = calcularStatusAcesso({ status: "ACTIVE", trialEndsAt: trialVencido, assinaturaAte: assVencida }, agora);
    expect(r.status).toBe("TRIAL_VENCIDO");
    expect(r.bloqueado).toBe(true);
  });

  it("SUSPENSO bloqueia independente do trial", () => {
    const r = calcularStatusAcesso({ status: "SUSPENDED", trialEndsAt: trialFuturo, assinaturaAte: null }, agora);
    expect(r.status).toBe("SUSPENSO");
    expect(r.bloqueado).toBe(true);
  });

  it("CANCELADO bloqueia independente do trial", () => {
    const r = calcularStatusAcesso({ status: "CANCELLED", trialEndsAt: trialFuturo, assinaturaAte: null }, agora);
    expect(r.status).toBe("CANCELADO");
    expect(r.bloqueado).toBe(true);
  });

  it("ATIVO para loja legada sem trialEndsAt nem assinatura (nao bloqueia)", () => {
    const r = calcularStatusAcesso({ status: "ACTIVE", trialEndsAt: null, assinaturaAte: null }, agora);
    expect(r.status).toBe("ATIVO");
    expect(r.bloqueado).toBe(false);
    expect(r.emTrial).toBe(false);
  });
});