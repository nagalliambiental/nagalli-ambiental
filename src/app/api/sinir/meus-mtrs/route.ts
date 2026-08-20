import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { consultarTodosManifestos, SINIR_TIPOS_PARCEIRO } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { conexaoId } = body;
  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
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

  const fim = new Date();
  const inicio = new Date(fim.getTime() - 29 * 86400000);
  const dataInicial = inicio.toISOString().slice(0, 10);
  const dataFinal = fim.toISOString().slice(0, 10);

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
    manifestos = await consultarTodosManifestos(conexaoCompleta, { dataInicial, dataFinal });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao consultar manifestos no SINIR" },
      { status: 502 }
    );
  }

  await prisma.sinirConexao.update({
    where: { id: conexao.id },
    data: { ultimoUsoEm: new Date() },
  });

  for (const m of manifestos) {
    await prisma.sinirManifesto.upsert({
      where: { conexaoId_numero: { conexaoId: conexao.id, numero: m.numero } },
      create: {
        conexaoId: conexao.id,
        numero: m.numero,
        status: m.status,
        certificado: m.certificado,
        clienteNome: m.clienteNome,
        empreendNome: m.empreendNome,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        dataExpedicao: m.dataExpedicao,
        dataRecebimento: m.dataRecebimento,
      },
      update: {
        status: m.status,
        certificado: m.certificado,
        clienteNome: m.clienteNome,
        empreendNome: m.empreendNome,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        dataExpedicao: m.dataExpedicao,
        dataRecebimento: m.dataRecebimento,
      },
    });
  }

  await logAuditoria(
    "ATUALIZAR",
    "SinirConexao",
    conexao.id,
    {
      acao: "meus-mtrs",
      conexao: conexao.nome,
      periodo: `${dataInicial} a ${dataFinal}`,
      papeis: SINIR_TIPOS_PARCEIRO.map((p) => `${p.rotulo}=${p.valor}`).join(", "),
      encontrados: manifestos.length,
    },
    session.user?.id ? Number(session.user.id) : undefined
  );

  const pendentes = manifestos.filter((m) => !m.certificado && m.status !== "CANCELADO");

  return NextResponse.json({
    conexao: { id: conexao.id, nome: conexao.nome, modo: conexao.modo },
    periodo: { dataInicial, dataFinal },
    papeis: SINIR_TIPOS_PARCEIRO.map((p) => p.rotulo),
    total: manifestos.length,
    pendentes: pendentes.length,
    manifestos,
  });
}