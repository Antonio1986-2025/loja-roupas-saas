/**
 * Calculos puros de acesso/plano do tenant (sem banco de dados).
 * Centralizados aqui para serem testaveis e reutilizaveis.
 */

export type StatusAcesso =
  | "ATIVO"          // pago e em dia, ou dentro do trial
  | "TRIAL_VENCENDO" // trial ativo, mas vence em 5 dias ou menos
  | "TRIAL_VENCIDO"  // trial expirou e nao tem assinatura
  | "SUSPENSO"       // conta suspensa manualmente
  | "CANCELADO";     // conta cancelada

export type InfoAcesso = {
  status: StatusAcesso;
  diasRestantesTrial: number | null;
  emTrial: boolean;
  bloqueado: boolean;
};

const DIAS_AVISO_TRIAL = 5;
const DIAS_TRIAL = 15;
const PRECO_MENSAL = 149.99;

export { DIAS_TRIAL, PRECO_MENSAL };

/** Calcula a data de fim do trial (15 dias a partir da criacao). */
export function calcularFimTrial(dataCriacao: Date, diasTrial = DIAS_TRIAL): Date {
  const fim = new Date(dataCriacao);
  fim.setDate(fim.getDate() + diasTrial);
  return fim;
}

/** Calcula quantos dias restam no trial (negativo = vencido). */
export function diasRestantesTrial(trialEndsAt: Date, agora: Date = new Date()): number {
  const msRestantes = trialEndsAt.getTime() - agora.getTime();
  return Math.ceil(msRestantes / (1000 * 60 * 60 * 24));
}

/**
 * Determina o status de acesso de um tenant baseado nos campos do banco.
 * Regra:
 *  - SUSPENSO/CANCELADO => imediato
 *  - assinaturaAte no futuro => ATIVO
 *  - trialEndsAt no futuro + sem assinatura => ATIVO ou TRIAL_VENCENDO
 *  - tudo vencido => TRIAL_VENCIDO (bloqueado)
 */
export function calcularStatusAcesso(tenant: {
  status: string;
  trialEndsAt: Date | null;
  assinaturaAte: Date | null;
}, agora: Date = new Date()): InfoAcesso {
  // Conta suspensa ou cancelada
  if (tenant.status === "SUSPENDED") {
    return { status: "SUSPENSO", diasRestantesTrial: null, emTrial: false, bloqueado: true };
  }
  if (tenant.status === "CANCELLED") {
    return { status: "CANCELADO", diasRestantesTrial: null, emTrial: false, bloqueado: true };
  }

  // Assinatura paga e em dia
  if (tenant.assinaturaAte && tenant.assinaturaAte.getTime() > agora.getTime()) {
    return { status: "ATIVO", diasRestantesTrial: null, emTrial: false, bloqueado: false };
  }

  // Verificar trial
  if (tenant.trialEndsAt) {
    const dias = diasRestantesTrial(tenant.trialEndsAt, agora);
    if (dias > DIAS_AVISO_TRIAL) {
      return { status: "ATIVO", diasRestantesTrial: dias, emTrial: true, bloqueado: false };
    }
    if (dias > 0) {
      return { status: "TRIAL_VENCENDO", diasRestantesTrial: dias, emTrial: true, bloqueado: false };
    }
    // Trial vencido
    return { status: "TRIAL_VENCIDO", diasRestantesTrial: 0, emTrial: false, bloqueado: true };
  }

  // Sem trial e sem assinatura (nao deveria acontecer, mas defensivo)
  return { status: "TRIAL_VENCIDO", diasRestantesTrial: 0, emTrial: false, bloqueado: true };
}