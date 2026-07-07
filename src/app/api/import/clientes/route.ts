import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────
// Helpers de formatação
// ─────────────────────────────────────────────

function formatarCpf(doc: string): string | null {
  const limpo = String(doc || "").replace(/\D/g, "");
  if (limpo.length === 11) {
    return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
  }
  return null;
}

function formatarCep(cep: string): string | null {
  const limpo = String(cep || "").replace(/\D/g, "");
  if (limpo.length === 8) return `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
  const s = String(cep || "").trim();
  return s || null;
}

function formatarTelefone(tel: string): string | null {
  const limpo = String(tel || "").replace(/\D/g, "");
  if (limpo.length === 11) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  if (limpo.length === 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  const s = String(tel || "").trim();
  return s || null;
}

function parsearData(val: unknown): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  const partes = s.split("/");
  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    const d = new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`);
    return isNaN(d.getTime()) ? null : d;
  }
  // número serial do Excel
  const n = Number(val);
  if (!isNaN(n) && n > 1000) {
    try {
      const parsed = XLSX.SSF.parse_date_code(n);
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    } catch { return null; }
  }
  return null;
}

function str(val: unknown): string {
  return String(val ?? "").trim();
}

// ─────────────────────────────────────────────
// POST /api/import/clientes
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Ler o Excel
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(bytes), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // As primeiras 3 linhas são cabeçalho do relatório; dados começam na linha 4
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: 3,
    });

    let criados = 0;
    let pulados = 0;
    let erros = 0;

    for (const row of rows) {
      const nome = str(row["Nome"]);

      // Ignorar linhas vazias, consumidor final e inativos
      if (
        !nome ||
        nome.toLowerCase().includes("consumidor final") ||
        nome.toUpperCase().startsWith("INATIVO")
      ) {
        pulados++;
        continue;
      }

      const docRaw   = str(row["CPF / CNPJ"]);
      const docLimpo = docRaw.replace(/\D/g, "");
      const ehCnpj   = docLimpo.length === 14;
      const cpf      = formatarCpf(docRaw);

      // Verificar duplicata por CPF
      if (cpf) {
        const existe = await prisma.cliente.findFirst({
          where: { tenantId, cpf },
          select: { id: true },
        });
        if (existe) { pulados++; continue; }
      }

      const endBase     = str(row["Endereço"]);
      const numero      = str(row["Número"]);
      const complemento = str(row["Complemento"]);
      const bairro      = str(row["Bairro"]);
      const endParts    = [endBase, numero, complemento].filter(Boolean);
      const endereco    = endParts.join(", ") || null;

      const obs = [
        ehCnpj ? `CNPJ: ${docRaw}` : null,
        str(row["Tipo de Pessoa"]) === "Jurídica" ? "Pessoa Jurídica" : null,
        bairro ? `Bairro: ${bairro}` : null,
      ].filter(Boolean).join(" | ") || null;

      try {
        await prisma.cliente.create({
          data: {
            nome,
            cpf,
            telefone:       formatarTelefone(str(row["Telefone"])),
            email:          str(row["Email"]) || null,
            dataNascimento: parsearData(row["Data de Nascimento"]),
            endereco,
            cidade:         str(row["Cidade"]) || null,
            estado:         str(row["Estado"]) || null,
            cep:            formatarCep(str(row["CEP"])),
            observacoes:    obs,
            tenantId,
          },
        });
        criados++;
      } catch {
        erros++;
      }
    }

    return NextResponse.json({ success: true, criados, pulados, erros });
  } catch (err: unknown) {
    console.error("[POST /api/import/clientes]", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
