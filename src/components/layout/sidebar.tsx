"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  FileText,
  Settings,
  TrendingUp,
  Store,
  UserCircle,
  Tag,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Truck,
  X,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "PDV",
    href: "/pdv",
    icon: ShoppingCart,
  },
  {
    title: "Produtos",
    href: "/produtos",
    icon: Package,
  },
  {
    title: "Categorias",
    href: "/categorias",
    icon: Tag,
  },
  {
    title: "Estoque",
    href: "/estoque",
    icon: Warehouse,
  },
  {
    title: "Entrada de Mercadorias",
    href: "/entradas",
    icon: Truck,
  },
  {
    title: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    title: "Vendas",
    href: "/vendas",
    icon: TrendingUp,
  },
  {
    title: "Condicionais",
    href: "/condicionais",
    icon: FileText,
  },
  {
    title: "Fornecedores",
    href: "/fornecedores",
    icon: Store,
  },
  {
    title: "Funcionários",
    href: "/funcionarios",
    icon: UserCircle,
  },
  {
    title: "Contas a Pagar",
    href: "/contas-pagar",
    icon: ArrowDownCircle,
  },
  {
    title: "Contas a Receber",
    href: "/contas-receber",
    icon: ArrowUpCircle,
  },
  {
    title: "Fluxo de Caixa",
    href: "/fluxo-caixa",
    icon: TrendingUp,
  },
  {
    title: "Caixa",
    href: "/caixa",
    icon: DollarSign,
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: FileText,
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];


function SidebarLogo() {
  const { data: session } = useSession();
  const tenantName = session?.user?.tenantName ?? "Stori";
  const [logoError, setLogoError] = useState(false);

  // Buscar logo do tenant via API
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/tenant/logo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.logo && setLogoUrl(d.logo))
      .catch(() => {});
  }, []);

  if (logoUrl && !logoError) {
    return (
      <img
        src={logoUrl}
        alt={tenantName}
        className="h-12 w-auto object-contain"
        onError={() => setLogoError(true)}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
        Stori
      </span>
      <h1 className="text-lg font-bold text-primary leading-tight">
        {tenantName}
      </h1>
    </div>
  );
}
export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [vencidas, setVencidas] = useState(0);

  useEffect(() => {
    fetch("/api/condicionais/alertas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setVencidas(d.vencidas))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r">
      <div className="flex items-center justify-between p-6">
        <SidebarLogo />
        {onClose && (
          <button onClick={onClose} className="md:hidden rounded-md p-1 hover:bg-sidebar-accent">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const showBadge = item.href === "/condicionais" && vencidas > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {showBadge && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {vencidas}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
