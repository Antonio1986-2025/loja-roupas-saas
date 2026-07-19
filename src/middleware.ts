import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccess } from "@/lib/roles";

const PUBLIC_ROUTES = ["/auth/login", "/auth/register", "/bloqueado", "/api/auth", "/api/plano", "/api/health", "/api/nfe/test-producao"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    if (token && (pathname === "/auth/login" || pathname === "/auth/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Not authenticated
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // API routes — just require auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check role-based access for dashboard routes
  const role = (token.role as string) ?? "USER";
  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL("/dashboard?acesso=negado", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png|.*\\.svg).*)"],
};
