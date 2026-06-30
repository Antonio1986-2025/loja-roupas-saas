export type AppRole = "ADMIN" | "MANAGER" | "USER" | "VENDEDOR" | "CAIXA" | "ESTOQUISTA" | "FINANCEIRO";

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  FINANCEIRO: "Financeiro",
  ESTOQUISTA: "Estoquista",
  VENDEDOR: "Vendedor",
  CAIXA: "Operador de Caixa",
  USER: "Usuário",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  ADMIN: "Acesso total ao sistema incluindo configurações e gestão de usuários",
  MANAGER: "Acesso a todos os módulos exceto configurações do sistema",
  FINANCEIRO: "Acesso ao financeiro, contas a pagar/receber, fluxo de caixa e relatórios",
  ESTOQUISTA: "Acesso a produtos, estoque, entradas de mercadoria e etiquetas",
  VENDEDOR: "Acesso ao PDV, clientes, orçamentos, condicionais e catálogo",
  CAIXA: "Acesso ao PDV e abertura/fechamento de caixa",
  USER: "Acesso básico somente leitura",
};

// Which routes each role can access (prefix match)
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  ADMIN: ["*"], // all routes
  MANAGER: [
    "/dashboard", "/pdv", "/produtos", "/categorias", "/estoque", "/etiquetas",
    "/entradas", "/clientes", "/vendas", "/orcamentos", "/condicionais",
    "/fornecedores", "/funcionarios", "/contas-pagar", "/contas-receber",
    "/fluxo-caixa", "/caixa", "/relatorios",
  ],
  FINANCEIRO: [
    "/dashboard", "/contas-pagar", "/contas-receber", "/fluxo-caixa",
    "/vendas", "/caixa", "/relatorios", "/fornecedores",
  ],
  ESTOQUISTA: [
    "/dashboard", "/produtos", "/categorias", "/estoque", "/etiquetas", "/entradas",
  ],
  VENDEDOR: [
    "/dashboard", "/pdv", "/produtos", "/categorias", "/clientes",
    "/orcamentos", "/condicionais", "/vendas",
  ],
  CAIXA: [
    "/dashboard", "/pdv", "/caixa", "/vendas",
  ],
  USER: ["/dashboard"],
};

export function canAccess(role: string, pathname: string): boolean {
  const r = role as AppRole;
  const perms = ROLE_PERMISSIONS[r] ?? ["/dashboard"];
  if (perms.includes("*")) return true;
  return perms.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-purple-100 text-purple-700",
    FINANCEIRO: "bg-blue-100 text-blue-700",
    ESTOQUISTA: "bg-yellow-100 text-yellow-700",
    VENDEDOR: "bg-green-100 text-green-700",
    CAIXA: "bg-orange-100 text-orange-700",
    USER: "bg-gray-100 text-gray-700",
  };
  return colors[role] ?? "bg-gray-100 text-gray-700";
}
