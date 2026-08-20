import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { gerarPdfAlertaMtrsSalvos } from "@/lib/sinir";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  const limiteDias = Number(req.nextUrl.searchParams.get("limiteDias")) || 7;

  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({ where: { id: conexaoId } });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  const limite = new Date();
  limite.setDate(limite.getDate() - limiteDias);

  const manifestos = await prisma.sinirManifesto.findMany({
    where: {
      conexaoId,
      status: { in: ["SALVO", "EMITIDO"] },
      dataExpedicao: { lt: limite },
    },
    orderBy: { dataExpedicao: "asc" },
  });

  const hoje = new Date();
  const mtrs = manifestos.map((m) => {
    const base = m.dataExpedicao || hoje;
    const dias = Math.max(1, Math.floor((hoje.getTime() - base.getTime()) / 86400000));
    return {
      numero: m.numero,
      clienteNome: m.clienteNome,
      empreendNome: m.empreendNome,
      transportadorNome: m.transportadorNome,
      destinadorNome: m.destinadorNome,
      quantidade: m.quantidade,
      unidade: m.unidade,
      dataExpedicao: m.dataExpedicao,
      diasEmSalvo: dias,
    };
  });

  const resultado = await gerarPdfAlertaMtrsSalvos(conexao.nome, limiteDias, mtrs);

  await logAuditoria(
    "DOWNLOAD",
    "SinirRelatorio",
    0,
    { acao: "relatorioSalvos", conexao: conexao.nome, limiteDias, mtrs: mtrs.length },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return new NextResponse(resultado.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resultado.nomeArquivo}"`,
    },
  });
}