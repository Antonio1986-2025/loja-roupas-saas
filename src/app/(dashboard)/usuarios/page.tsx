"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, getRoleColor, AppRole } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

type UserWithFuncionario = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  funcionario: { id: string; nome: string; cargo: string | null } | null;
};

type FuncionarioOption = {
  id: string;
  nome: string;
  cargo: string | null;
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-default ${getRoleColor(role)}`}
      title={ROLE_DESCRIPTIONS[role as AppRole] ?? ""}
    >
      {ROLE_LABELS[role as AppRole] ?? role}
    </span>
  );
}

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={null}>
      <UsuariosContent />
    </Suspense>
  );
}

function UsuariosContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserWithFuncionario[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState<UserWithFuncionario | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithFuncionario | null>(null);

  // Form state - new user
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("USER");
  const [newFuncionarioId, setNewFuncionarioId] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state - edit user
  const [editRole, setEditRole] = useState<AppRole>("USER");
  const [editPassword, setEditPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFuncionarios = useCallback(async () => {
    try {
      const res = await fetch("/api/funcionarios?sem-usuario=true");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.funcionarios ?? [];
        setFuncionarios(list);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-open new modal if query params are present (from funcionarios page)
  useEffect(() => {
    if (searchParams.get("novo") === "true" && session?.user?.role === "ADMIN") {
      const funcionarioId = searchParams.get("funcionarioId") ?? "";
      fetchFuncionarios().then(() => {
        setNewName("");
        setNewEmail("");
        setNewPassword(randomPassword());
        setNewRole("USER");
        setNewFuncionarioId(funcionarioId);
        setShowNew(true);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, session]);

  function openNew() {
    setNewName("");
    setNewEmail("");
    setNewPassword(randomPassword());
    setNewRole("USER");
    setNewFuncionarioId("");
    fetchFuncionarios();
    setShowNew(true);
  }

  function openEdit(user: UserWithFuncionario) {
    setEditUser(user);
    setEditRole(user.role as AppRole);
    setEditPassword("");
    setShowEdit(true);
  }

  function openDelete(user: UserWithFuncionario) {
    setDeleteUser(user);
    setShowDelete(true);
  }

  async function handleCreate() {
    if (!newName || !newEmail || !newPassword || !newRole) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          funcionarioId: newFuncionarioId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao criar usuário");
        return;
      }
      toast.success("Usuário criado com sucesso");
      setShowNew(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { role: editRole };
      if (editPassword) body.password = editPassword;
      const res = await fetch(`/api/usuarios/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao atualizar usuário");
        return;
      }
      toast.success("Usuário atualizado");
      setShowEdit(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${deleteUser.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao excluir usuário");
        return;
      }
      toast.success("Usuário excluído");
      setShowDelete(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <UserX className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm">
          Apenas administradores podem gerenciar usuários do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Usuários do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários e permissões de acesso do tenant
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Perfil</th>
              <th className="text-left px-4 py-3 font-medium">Funcionário</th>
              <th className="text-left px-4 py-3 font-medium">Criado em</th>
              <th className="text-right px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    {user.funcionario ? (
                      <span className="text-sm">
                        {user.funcionario.nome}
                        {user.funcionario.cargo && (
                          <span className="text-muted-foreground ml-1">
                            ({user.funcionario.cargo})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(new Date(user.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
                        title="Editar perfil"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {session.user.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDelete(user)}
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Usuário */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Senha *</Label>
              <div className="flex gap-2">
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setNewPassword(randomPassword())}
                  title="Gerar senha aleatória"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe esta senha com o usuário após criação.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Perfil *</Label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AppRole)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>
                    {ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Vincular a Funcionário (opcional)</Label>
              <select
                value={newFuncionarioId}
                onChange={(e) => setNewFuncionarioId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">— Nenhum —</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome} {f.cargo ? `(${f.cargo})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Usuário */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="font-medium">{editUser.name}</p>
                <p className="text-sm text-muted-foreground">{editUser.email}</p>
              </div>
              <div className="space-y-1">
                <Label>Perfil</Label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as AppRole)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>
                      {ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Nova senha (deixe em branco para manter)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova senha (opcional)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => setEditPassword(randomPassword())}
                    title="Gerar senha aleatória"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowEdit(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEdit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
          </DialogHeader>
          {deleteUser && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir o usuário{" "}
                <strong>{deleteUser.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
