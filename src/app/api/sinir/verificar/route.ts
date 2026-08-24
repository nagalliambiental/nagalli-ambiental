import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logAuditoria } from "@/lib/audit";
import { verificarManifestos, classeDeResiduos } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { conexaoId, dataInicial, dataFinal, tipoParceiro } = body;

  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }
  if (!dataInicial || !dataFinal) {
    return NextResponse.json({ error: "dataInicial e dataFinal são obrigatórias" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({
    where: { id: Number(conexaoId) },
  });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }
  if (!conexao.ativo) {
    return NextResponse.json({ error: "Conexão inativa" }, { status: 400 });
  }

  const conexaoCompleta = {
    id: conexao.id,
    nome: conexao.nome,
    cnpj: conexao.cnpj,
    unidade: conexao.unidade,
    token: conexao.token,
    modo: conexao.modo,
    venceEm: conexao.venceEm,
    ativo: conexao.ativo,
    ultimoUsoEm: conexao.ultimoUsoEm,
  };

  let manifestos;
  try {
    manifestos = await verificarManifestos(conexaoCompleta, {
      dataInicial,
      dataFinal,
      tipoParceiro: tipoParceiro ? Number(tipoParceiro) : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao verificar manifestos" },
      { status: 502 }
    );
  }

  await prisma.sinirConexao.update({
    where: { id: conexao.id },
    data: { ultimoUsoEm: new Date() },
  });

  // Sincroniza com o banco: upsert por (conexaoId, numero)
  for (const m of manifestos) {
    const ident = classeDeResiduos(m.residuos);
    const dadosClasse = ident.letra
      ? { classeNome: ident.letra, classeRisco: ident.resCodigoIbama || m.classeRisco || null }
      : {};
    await prisma.sinirManifesto.upsert({
      where: { conexaoId_numero: { conexaoId: conexao.id, numero: m.numero } },
      create: {
        conexaoId: conexao.id,
        numero: m.numero,
        status: m.status,
        certificado: m.certificado,
        clienteNome: m.clienteNome,
        empreendNome: m.empreendNome,
        transportadorNome: m.transportadorNome,
        destinadorNome: m.destinadorNome,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        dataExpedicao: m.dataExpedicao,
        dataRecebimento: m.dataRecebimento,
        residuos: m.residuos as Prisma.InputJsonValue,
        ...dadosClasse,
      },
      update: {
        status: m.status,
        certificado: m.certificado,
        clienteNome: m.clienteNome,
        empreendNome: m.empreendNome,
        transportadorNome: m.transportadorNome,
        destinadorNome: m.destinadorNome,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        dataExpedicao: m.dataExpedicao,
        dataRecebimento: m.dataRecebimento,
        residuos: m.residuos as Prisma.InputJsonValue,
        ...dadosClasse,
      },
    });
  }

  await logAuditoria(
    "ATUALIZAR",
    "SinirConexao",
    conexao.id,
    { acao: "verificar", conexao: conexao.nome, periodo: `${dataInicial} a ${dataFinal}`, encontrados: manifestos.length },
    session.user?.id ? Number(session.user.id) : undefined
  );

  const pendentes = manifestos.filter((m) => !m.certificado && m.status !== "CANCELADO");

  return NextResponse.json({
    conexao: { id: conexao.id, nome: conexao.nome, modo: conexao.modo },
    total: manifestos.length,
    certificados: manifestos.filter((m) => m.certificado).length,
    pendentes: pendentes.length,
    manifestos,
  });
}