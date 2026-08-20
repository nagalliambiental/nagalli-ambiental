import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { emitirCdf, SinirError } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { conexaoId, numeros, nomeResponsavel } = body;

  if (!conexaoId || !Array.isArray(numeros) || numeros.length === 0 || !nomeResponsavel) {
    return NextResponse.json({ error: "conexaoId, numeros e nomeResponsavel são obrigatórios" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({ where: { id: Number(conexaoId) } });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  try {
    const resultado = await emitirCdf(
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
      numeros.map(String),
      String(nomeResponsavel)
    );

    await logAuditoria(
      "CRIAR",
      "SinirCDF",
      0,
      { acao: "emitirCdf", conexao: conexao.nome, cdfNumero: resultado.cdfNumero, quantidade: resultado.quantidade, simulacao: resultado.simulacao },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(resultado, { status: 201 });
  } catch (err) {
    if (err instanceof SinirError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao emitir CDF" }, { status: 500 });
  }
}