import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { gerarPdfMtrsSalvosPorDestinador } from "@/lib/sinir";

// Trimestre corrente (período de referência do SINIR): 24/08/2026 -> 3º trimestre = 01/07/2026 a 30/09/2026
function trimestreCorrente(ref = new Date()) {
  const ano = ref.getFullYear();
  const indice = Math.floor(ref.getMonth() / 3);
  const inicio = new Date(ano, indice * 3, 1);
  const fim = new Date(ano, indice * 3 + 3, 0, 23, 59, 59, 999);
  const rotulo = `${indice + 1}º trimestre de ${ano}`;
  return { inicio, fim, rotulo };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({
    where: { id: conexaoId },
    include: { empreendimento: true },
  });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  const { inicio, fim, rotulo } = trimestreCorrente();

  const manifestos = await prisma.sinirManifesto.findMany({
    where: {
      conexaoId,
      status: "SALVO",
      dataExpedicao: { gte: inicio, lte: fim },
    },
    orderBy: [{ destinadorNome: "asc" }, { dataExpedicao: "asc" }],
  });

  const empreendimentoNome = conexao.empreendimento?.apelido || conexao.nome;
  const unidadeSinir = conexao.empreendimento?.unidadeSinir || conexao.unidade;

  const resultado = await gerarPdfMtrsSalvosPorDestinador(
    empreendimentoNome,
    unidadeSinir,
    manifestos.map((m) => ({
      numero: m.numero,
      destinadorNome: m.destinadorNome,
      dataExpedicao: m.dataExpedicao,
    })),
    rotulo
  );

  await logAuditoria(
    "DOWNLOAD",
    "SinirRelatorio",
    0,
    { acao: "relatorioSalvos", conexao: conexao.nome, mtrs: manifestos.length },
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
