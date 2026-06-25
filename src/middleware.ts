export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pdv/:path*",
    "/produtos/:path*",
    "/clientes/:path*",
    "/vendas/:path*",
    "/estoque/:path*",
    "/condicionais/:path*",
    "/categorias/:path*",
    "/contas-pagar/:path*",
    "/contas-receber/:path*",
    "/fluxo-caixa/:path*",
    "/fornecedores/:path*",
    "/funcionarios/:path*",
    "/relatorios/:path*",
    "/configuracoes/:path*",
    "/entradas/:path*",
    "/caixa/:path*",
  ],
};
