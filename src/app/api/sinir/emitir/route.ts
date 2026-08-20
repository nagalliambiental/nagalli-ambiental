import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { emitirManifesto, SinirError } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    conexaoId, clienteNome, empreendNome, resumo, quantidade, unidade,
    transportadorCnpj, destinadorCnpj,
    nomeResponsavel, nomeMotorista, placaVeiculo, dataExpedicao, observacoes, residuos,
  } = body;

  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({
    where: { id: Number(conexaoId) },
  });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
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

  try {
    const resultado = await emitirManifesto(conexaoCompleta, {
      conexaoId: conexao.id,
      clienteNome,
      empreendNome,
      resumo,
      quantidade: Number(quantidade),
      unidade: unidade || "kg",
      transportadorCnpj: String(transportadorCnpj || ""),
      destinadorCnpj: String(destinadorCnpj || ""),
      nomeResponsavel: nomeResponsavel ? String(nomeResponsavel) : undefined,
      nomeMotorista: nomeMotorista ? String(nomeMotorista) : undefined,
      placaVeiculo: placaVeiculo ? String(placaVeiculo) : undefined,
      dataExpedicao: dataExpedicao ? Number(dataExpedicao) : undefined,
      observacoes: observacoes ? String(observacoes) : undefined,
      residuos: Array.isArray(residuos) && residuos.length ? residuos : undefined,
    });

    await prisma.sinirConexao.update({
      where: { id: conexao.id },
      data: { ultimoUsoEm: new Date() },
    });

    await logAuditoria(
      "CRIAR",
      "SinirManifesto",
      conexao.id,
      { acao: "emitir", conexao: conexao.nome, numero: resultado.numero, simulacao: resultado.simulacao, resumo },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(resultado, { status: 201 });
  } catch (err) {
    if (err instanceof SinirError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao emitir MTR" }, { status: 500 });
  }
}