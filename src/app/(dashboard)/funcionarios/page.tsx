import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, UserCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getRoleColor, ROLE_LABELS, AppRole } from "@/lib/roles";

async function getFuncionarios(tenantId: string) {
  return await prisma.funcionario.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}

export default async function FuncionariosPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const funcionarios = await getFuncionarios(session.user.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie seus funcionários cadastrados
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/funcionarios/novo">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Funcionário</span>
          </Link>
        </Button>
      </div>

      {funcionarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-lg border bg-card">
          <UserCircle className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhum funcionário cadastrado</h3>
          <p className="text-sm text-muted-foreground">
            Comece cadastrando seu primeiro funcionário
          </p>
          <Button asChild>
            <Link href="/funcionarios/novo">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Funcionário
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">CPF</th>
                <th className="text-left px-4 py-3 font-medium">Cargo</th>
                <th className="text-left px-4 py-3 font-medium">Admissão</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Acesso ao Sistema</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((funcionario) => (
                <tr
                  key={funcionario.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{funcionario.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {funcionario.cpf}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {funcionario.cargo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(funcionario.dataAdmissao)}
                  </td>
                  <td className="px-4 py-3">
                    {funcionario.ativo ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-xs font-semibold">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {funcionario.user ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-semibold">
                          Tem Acesso
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getRoleColor(funcionario.user.role)}`}
                        >
                          {ROLE_LABELS[funcionario.user.role as AppRole] ?? funcionario.user.role}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-xs font-semibold">
                        Sem Acesso
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/funcionarios/${funcionario.id}`}>Editar</Link>
                      </Button>
                      {session.user.role === "ADMIN" && (
                        funcionario.user ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/usuarios`}>Gerenciar Acesso</Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/usuarios?novo=true&funcionarioId=${funcionario.id}`}>
                              Criar Acesso
                            </Link>
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
