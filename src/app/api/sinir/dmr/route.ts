import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { gerarPdfDmr, SinirError } from "@/lib/sinir";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  const empreendimentoId = Number(req.nextUrl.searchParams.get("empreendimentoId"));
  const ano = Number(req.nextUrl.searchParams.get("ano")) || new Date().getFullYear();
  const trimestre = Number(req.nextUrl.searchParams.get("trimestre")) || 1;

  if (!conexaoId || !empreendimentoId) {
    return NextResponse.json({ error: "conexaoId e empreendimentoId são obrigatórios" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({ where: { id: conexaoId } });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    include: { cliente: true },
  });
  if (!empreendimento) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  const mesInicio = (trimestre - 1) * 3 + 1;
  const inicio = new Date(ano, mesInicio - 1, 1);
  const fim = new Date(ano, mesInicio + 2, 31, 23, 59, 59);

  const manifestos = await prisma.sinirManifesto.findMany({
    where: {
      conexaoId,
      clienteNome: empreendimento.cliente.apelido,
      dataExpedicao: { gte: inicio, lte: fim },
    },
    orderBy: { dataExpedicao: "asc" },
  });

  try {
    const resultado = await gerarPdfDmr(
      {
        cnpj: empreendimento.cnpj || empreendimento.cliente.cnpj,
        razaoSocial: empreendimento.cliente.razaoSocial,
        nomeFantasia: empreendimento.cliente.nomeFantasia,
        municipio: empreendimento.municipio || empreendimento.cliente.municipio,
        uf: empreendimento.uf || empreendimento.cliente.uf,
      },
      { ano, trimestre },
      manifestos.map((m) => ({
        numero: m.numero,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        status: m.status,
        certificado: m.certificado,
        dataExpedicao: m.dataExpedicao,
      }))
    );

    const filename = encodeURIComponent(`DMR-${trimestre}T-${ano}.pdf`).replace(/'/g, "%27");

    await logAuditoria(
      "DOWNLOAD",
      "SinirDMR",
      0,
      { acao: "gerarDmr", conexao: conexao.nome, empreendimento: empreendimento.apelido, trimestre, ano, manifestos: manifestos.length },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return new NextResponse(resultado.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resultado.nomeArquivo}"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    if (err instanceof SinirError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao gerar a DMR" }, { status: 500 });
  }
}