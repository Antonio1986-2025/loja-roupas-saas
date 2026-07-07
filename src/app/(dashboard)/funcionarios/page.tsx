import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UserCircle, Phone, BadgeCheck, BadgeX, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getFuncionarios(tenantId: string) {
  return await prisma.funcionario.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum funcionário cadastrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece cadastrando seu primeiro funcionário
            </p>
            <Button asChild>
              <Link href="/funcionarios/novo">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Funcionário
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {funcionarios.map((funcionario) => (
            <Card key={funcionario.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {funcionario.nome}
                      </h3>
                      {funcionario.ativo ? (
                        <BadgeCheck className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <BadgeX className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {funcionario.cargo && (
                        <p className="text-sm font-medium text-muted-foreground">
                          {funcionario.cargo}
                        </p>
                      )}
                      {funcionario.telefone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {funcionario.telefone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Admissão: {formatDate(funcionario.dataAdmissao)}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/funcionarios/${funcionario.id}`}>
                      Editar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
