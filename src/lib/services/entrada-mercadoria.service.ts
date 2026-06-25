import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { CreateEntradaMercadoriaInput } from "@/lib/validations/entrada-mercadoria";

export class EntradaMercadoriaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "EntradaMercadoriaError";
  }
}

type ItemCalculado = {
  varianteId: string;
  quantidade: number;
  precoUnitario: Prisma.Decimal;
  precoCusto: Prisma.Decimal | null;
  custoFrete: Prisma.Decimal;
  custoDespesas: Prisma.Decimal;
  custoFinal: Prisma.Decimal;
  margemLucro: Prisma.Decimal | null;
  precoVendaSugerido: Prisma.Decimal | null;
  valorICMS: Prisma.Decimal | null;
  valorPIS: Prisma.Decimal | null;
  valorCOFINS: Prisma.Decimal | null;
};

function calcularRateio(data: CreateEntradaMercadoriaInput): ItemCalculado[] {
  const frete = new Prisma.Decimal(data.valorFrete || 0);
  const despesas = new Prisma.Decimal(data.valorDespesas || 0);
  const seguro = new Prisma.Decimal(data.valorSeguro || 0);
  const desconto = new Prisma.Decimal(data.valorDesconto || 0);
  const margemPadrao = data.margemLucroPadrao
    ? new Prisma.Decimal(data.margemLucroPadrao)
    : null;

  const totalDespesas = frete.add(despesas).add(seguro).sub(desconto);
  const valorTotalItens = data.itens.reduce(
    (s, item) => s.add(new Prisma.Decimal(item.precoUnitario * item.quantidade)),
    new Prisma.Decimal(0)
  );

  return data.itens.map((item) => {
    const qtd = new Prisma.Decimal(item.quantidade);
    const precoUnit = new Prisma.Decimal(item.precoUnitario);
    const valorItem = precoUnit.mul(qtd);

    const peso = valorTotalItens.isZero()
      ? new Prisma.Decimal(0)
      : valorItem.div(valorTotalItens);

    const custoFrete = totalDespesas.mul(peso);
    const custoDespesas = new Prisma.Decimal(0);

    const itemIcms = item.valorICMS ? new Prisma.Decimal(item.valorICMS) : new Prisma.Decimal(0);
    const itemPis = item.valorPIS ? new Prisma.Decimal(item.valorPIS) : new Prisma.Decimal(0);
    const itemCofins = item.valorCOFINS ? new Prisma.Decimal(item.valorCOFINS) : new Prisma.Decimal(0);

    // Simples Nacional: custo = precoFornecedor + frete + despesas + impostos (nada recupera)
    const custoFinal = precoUnit
      .add(custoFrete)
      .add(custoDespesas)
      .add(itemIcms)
      .add(itemPis)
      .add(itemCofins)
      .div(qtd);

    const margem = item.margemLucro
      ? new Prisma.Decimal(item.margemLucro)
      : margemPadrao;

    const precoVendaSugerido =
      item.precoVendaSugerido && item.precoVendaSugerido > 0
        ? new Prisma.Decimal(item.precoVendaSugerido)
        : margem && !margem.isZero()
        ? custoFinal.div(new Prisma.Decimal(1).sub(margem.div(100)))
        : null;

    return {
      varianteId: item.varianteId,
      quantidade: item.quantidade,
      precoUnitario: precoUnit,
      precoCusto: item.precoCusto ? new Prisma.Decimal(item.precoCusto) : null,
      custoFrete,
      custoDespesas,
      custoFinal,
      margemLucro: margem,
      precoVendaSugerido,
      valorICMS: itemIcms.isZero() ? null : itemIcms,
      valorPIS: itemPis.isZero() ? null : itemPis,
      valorCOFINS: itemCofins.isZero() ? null : itemCofins,
    };
  });
}

export async function listarEntradas(tenantId: string, limit = 50) {
  return prisma.entradaMercadoria.findMany({
    where: { tenantId },
    include: {
      fornecedor: { select: { id: true, nome: true } },
      itens: {
        select: {
          id: true,
          quantidade: true,
          precoUnitario: true,
          precoCusto: true,
          custoFinal: true,
          variante: {
            select: {
              id: true,
              cor: true,
              tamanho: true,
              produto: { select: { nome: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function buscarEntrada(tenantId: string, id: string) {
  const entrada = await prisma.entradaMercadoria.findFirst({
    where: { id, tenantId },
    include: {
      fornecedor: { select: { id: true, nome: true, cnpj: true } },
      itens: {
        include: {
          variante: {
            include: {
              produto: { select: { nome: true, precoVenda: true } },
            },
          },
        },
      },
    },
  });

  if (!entrada) {
    throw new EntradaMercadoriaError("NAO_ENCONTRADA", "Entrada não encontrada");
  }

  return entrada;
}

export async function criarEntrada(tenantId: string, data: CreateEntradaMercadoriaInput) {
  const itensCalculados = calcularRateio(data);

  return prisma.$transaction(async (tx) => {
    for (const item of data.itens) {
      const variante = await tx.produtoVariante.findUnique({
        where: { id: item.varianteId },
        include: { produto: { select: { tenantId: true } } },
      });

      if (!variante) {
        throw new EntradaMercadoriaError("VARIANTE_NAO_ENCONTRADA", "Produto não encontrado");
      }
      if (variante.produto.tenantId !== tenantId) {
        throw new EntradaMercadoriaError("ACESSO_NEGADO", "Produto não pertence ao seu tenant");
      }
    }

    const ultima = await tx.entradaMercadoria.findFirst({
      where: { tenantId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (ultima?.numero ?? 0) + 1;

    const entrada = await tx.entradaMercadoria.create({
      data: {
        numero,
        tenantId,
        fornecedorId: data.fornecedorId || null,
        chaveAcesso: data.chaveAcesso || null,
        numeroNFe: data.numeroNFe || null,
        serieNFe: data.serieNFe || null,
        dataEmissao: data.dataEmissao ? new Date(data.dataEmissao) : null,
        cfop: data.cfop || null,
        naturezaOperacao: data.naturezaOperacao || null,
        dataEntrada: new Date(),
        valorFrete: data.valorFrete ? new Prisma.Decimal(data.valorFrete) : null,
        valorSeguro: data.valorSeguro ? new Prisma.Decimal(data.valorSeguro) : null,
        valorDespesas: data.valorDespesas ? new Prisma.Decimal(data.valorDespesas) : null,
        valorDesconto: data.valorDesconto ? new Prisma.Decimal(data.valorDesconto) : null,
        valorICMS: data.valorICMS ? new Prisma.Decimal(data.valorICMS) : null,
        valorPIS: data.valorPIS ? new Prisma.Decimal(data.valorPIS) : null,
        valorCOFINS: data.valorCOFINS ? new Prisma.Decimal(data.valorCOFINS) : null,
        valorIPI: data.valorIPI ? new Prisma.Decimal(data.valorIPI) : null,
        xmlOriginal: data.xmlOriginal || null,
        margemLucroPadrao: data.margemLucroPadrao
          ? new Prisma.Decimal(data.margemLucroPadrao)
          : null,
        gerarContasPagar: data.gerarContasPagar ?? true,
        observacao: data.observacao || null,
        itens: {
          create: itensCalculados.map((ic) => ({
            varianteId: ic.varianteId,
            quantidade: ic.quantidade,
            precoUnitario: ic.precoUnitario,
            precoCusto: ic.precoCusto,
            custoFrete: ic.custoFrete.isZero() ? null : ic.custoFrete,
            custoDespesas: ic.custoDespesas.isZero() ? null : ic.custoDespesas,
            custoFinal: ic.custoFinal,
            margemLucro: ic.margemLucro,
            precoVendaSugerido: ic.precoVendaSugerido,
            valorICMS: ic.valorICMS,
            valorPIS: ic.valorPIS,
            valorCOFINS: ic.valorCOFINS,
          })),
        },
      },
      include: {
        itens: {
          include: {
            variante: {
              include: { produto: { select: { nome: true } } },
            },
          },
        },
      },
    });

    for (const ic of itensCalculados) {
      const variante = await tx.produtoVariante.findUnique({
        where: { id: ic.varianteId },
        select: { produtoId: true },
      });

      if (variante?.produtoId) {
        const produtoUpdate: { precoCusto: Prisma.Decimal; precoVenda?: Prisma.Decimal } = {
          precoCusto: ic.custoFinal,
        };
        if (ic.precoVendaSugerido) {
          produtoUpdate.precoVenda = ic.precoVendaSugerido;
        }
        await tx.produto.update({
          where: { id: variante.produtoId },
          data: produtoUpdate,
        });
      }

      await tx.produtoVariante.update({
        where: { id: ic.varianteId },
        data: {
          qtdEstoque: { increment: ic.quantidade },
          qtdDisponivel: { increment: ic.quantidade },
          ...(ic.precoVendaSugerido ? { precoVenda: ic.precoVendaSugerido } : {}),
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          varianteId: ic.varianteId,
          tipo: "ENTRADA",
          quantidade: ic.quantidade,
          observacao: `Entrada #${numero}`,
        },
      });
    }

    if (data.gerarContasPagar && data.valorTotal && data.parcelas) {
      const parcelas = data.parcelas as { valor: number; vencimento: string }[];
      if (parcelas.length > 0) {
        await tx.contaPagar.createMany({
          data: parcelas.map((p, i) => ({
            descricao: `${data.numeroNFe ? `NF ${data.numeroNFe} - ` : ""}Parcela ${String.fromCharCode(65 + i)}`,
            valor: new Prisma.Decimal(p.valor),
            dataVencimento: new Date(p.vencimento),
            status: "PENDENTE",
            categoria: "FORNECEDOR",
            fornecedorId: data.fornecedorId || null,
            entradaId: entrada.id,
            observacoes: `Gerado da entrada #${numero}`,
            tenantId,
          })),
        });
      }
    }

    return entrada;
  });
}
