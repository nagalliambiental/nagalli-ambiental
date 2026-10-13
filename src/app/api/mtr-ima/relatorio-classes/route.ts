import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarPdfMtrsImaPorClasse } from "@/lib/mtr-ima-relatorio";

function periodo(req: NextRequest): { inicio: Date; fim: Date } {
  const inicioParam = req.nextUrl.searchParams.get("dataInicial");
  const fimParam = req.nextUrl.searchParams.get("dataFinal");
  const agora = new Date();
  const inicio = inicioParam ? new Date(`${inicioParam}T00:00:00`) : new Date(agora.getTime() - 29 * 86400000);
  const fim = fimParam ? new Date(`${fimParam}T23:59:59`) : agora;
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio > fim) throw new Error("Período inválido");
  return { inicio, fim };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  const classe = req.nextUrl.searchParams.get("classe") || "";
  if (!conexaoId) return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });

  try {
    const p = periodo(req);
    const conexao = await prisma.mtrImaConexao.findUnique({ where: { id: conexaoId }, select: { nome: true } });
    if (!conexao) return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });

    const manifestos = await prisma.mtrImaManifesto.findMany({
      where: {
        conexaoId,
        status: { not: "CANCELADO" },
        dataExpedicao: { gte: p.inicio, lte: p.fim },
        ...(classe ? { classeNome: classe } : {}),
      },
      orderBy: { dataExpedicao: "asc" },
      select: { numero: true, classeNome: true, dataExpedicao: true, clienteNome: true, destinadorNome: true, quantidade: true, unidade: true },
    });

    const pdf = await gerarPdfMtrsImaPorClasse(conexao.nome, manifestos, p);
    const hoje = new Date().toISOString().slice(0, 10);
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mtrs-ima-por-classe-${hoje}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao gerar relatório" }, { status: 400 });
  }
}
