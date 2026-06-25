import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarEntrada,
  EntradaMercadoriaError,
} from "@/lib/services/entrada-mercadoria.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const entrada = await buscarEntrada(session.user.tenantId, params.id);

    const data = {
      ...entrada,
      valorFrete: entrada.valorFrete ? Number(entrada.valorFrete) : null,
      valorSeguro: entrada.valorSeguro ? Number(entrada.valorSeguro) : null,
      valorDespesas: entrada.valorDespesas ? Number(entrada.valorDespesas) : null,
      valorDesconto: entrada.valorDesconto ? Number(entrada.valorDesconto) : null,
      valorICMS: entrada.valorICMS ? Number(entrada.valorICMS) : null,
      valorPIS: entrada.valorPIS ? Number(entrada.valorPIS) : null,
      valorCOFINS: entrada.valorCOFINS ? Number(entrada.valorCOFINS) : null,
      valorIPI: entrada.valorIPI ? Number(entrada.valorIPI) : null,
      margemLucroPadrao: entrada.margemLucroPadrao ? Number(entrada.margemLucroPadrao) : null,
      itens: entrada.itens.map((i) => ({
        ...i,
        precoUnitario: Number(i.precoUnitario),
        precoCusto: i.precoCusto ? Number(i.precoCusto) : null,
        custoFrete: i.custoFrete ? Number(i.custoFrete) : null,
        custoDespesas: i.custoDespesas ? Number(i.custoDespesas) : null,
        custoFinal: i.custoFinal ? Number(i.custoFinal) : null,
        margemLucro: i.margemLucro ? Number(i.margemLucro) : null,
        precoVendaSugerido: i.precoVendaSugerido ? Number(i.precoVendaSugerido) : null,
        valorICMS: i.valorICMS ? Number(i.valorICMS) : null,
        valorPIS: i.valorPIS ? Number(i.valorPIS) : null,
        valorCOFINS: i.valorCOFINS ? Number(i.valorCOFINS) : null,
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof EntradaMercadoriaError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 404 }
      );
    }
    console.error("[GET /api/entradas/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
