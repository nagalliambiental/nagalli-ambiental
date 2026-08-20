import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { cancelarManifesto, SinirError } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { conexaoId, numero, justificativa } = body;

  if (!conexaoId || !numero || !justificativa) {
    return NextResponse.json({ error: "conexaoId, numero e justificativa são obrigatórios" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({ where: { id: Number(conexaoId) } });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  try {
    const resultado = await cancelarManifesto(
      {
        id: conexao.id,
        nome: conexao.nome,
        cnpj: conexao.cnpj,
        unidade: conexao.unidade,
        token: conexao.token,
        modo: conexao.modo,
        venceEm: conexao.venceEm,
        ativo: conexao.ativo,
        ultimoUsoEm: conexao.ultimoUsoEm,
      },
      String(numero),
      String(justificativa)
    );

    await logAuditoria(
      "ATUALIZAR",
      "SinirManifesto",
      0,
      { acao: "cancelar", conexao: conexao.nome, numero, simulacao: resultado.simulacao, justificativa },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    if (err instanceof SinirError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao cancelar MTR" }, { status: 500 });
  }
}