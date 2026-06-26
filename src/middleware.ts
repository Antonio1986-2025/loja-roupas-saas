import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROTAS_PUBLICAS = ["/auth/login", "/auth/register", "/bloqueado", "/api/auth", "/api/plano"];
const ROTAS_PROTEGIDAS = [
  "/dashboard", "/pdv", "/produtos", "/clientes", "/vendas", "/estoque",
  "/condicionais", "/categorias", "/contas-pagar", "/contas-receber",
  "/fluxo-caixa", "/fornecedores", "/funcionarios", "/relatorios",
  "/configuracoes", "/entradas", "/caixa",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estaticos
  if (pathname.startsWith("/_next") || pathname.startsWith("/icons") ||
      pathname.includes(".") ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Rota publica: se ja logado, redireciona pro dashboard
  if (ROTAS_PUBLICAS.some((r) => pathname.startsWith(r))) {
    if (token && (pathname === "/auth/login" || pathname === "/auth/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Rota protegida: nao logado => login
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Verificar status do plano via token (sem bater no banco a cada request)
  // O campo 'bloqueado' sera injetado no token apos o check da API
  // Por ora, usamos a rota /api/plano no client-side para redirecionar
  // O middleware apenas garante autenticacao

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png|.*\\.svg).*)",
  ],
};