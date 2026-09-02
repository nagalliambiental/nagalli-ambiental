import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { emitirManifesto, MtrImaError } from "@/lib/mtr-ima";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { conexaoId, ...rest } = body;

  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }

  const conexao = await prisma.mtrImaConexao.findUnique({ where: { id: Number(conexaoId) } });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  try {
    const resultado = await emitirManifesto({
      conexaoId: conexao.id,
      ...rest,
    });

    await logAuditoria(
      "CRIAR",
      "MtrImaManifesto",
      conexao.id,
      { acao: "emitir", conexao: conexao.nome, numero: resultado.numero },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof MtrImaError ? e.status : 500;
    const msg = e instanceof MtrImaError ? e.message : "Erro ao emitir manifesto";
    return NextResponse.json({ error: msg }, { status });
  }
}
