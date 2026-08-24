import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { gerarPdfMtrsPorClasse } from "@/lib/sinir";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  const filtro = req.nextUrl.searchParams.get("filtro") || "todos";

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

  const where: Record<string, unknown> = { conexaoId };
  if (filtro === "pendentes") {
    where.status = { in: ["SALVO", "EMITIDO"] };
    where.certificado = false;
  } else if (filtro === "certificados") {
    where.certificado = true;
  } else if (filtro === "cancelados") {
    where.status = "CANCELADO";
  }

  const manifestos = await prisma.sinirManifesto.findMany({
    where,
    orderBy: [{ destinadorNome: "asc" }, { dataExpedicao: "asc" }],
  });

  const empreendimentoNome = conexao.empreendimento?.apelido || conexao.nome;
  const unidadeSinir = conexao.empreendimento?.unidadeSinir || conexao.unidade;

  const mtrsPorClasse = manifestos.map((m) => ({
    numero: m.numero,
    classeRisco: m.classeRisco || "",
    classeNome: m.classeNome || "Não identificado",
    dataExpedicao: m.dataExpedicao,
    destinadorNome: m.destinadorNome,
    quantidade: m.quantidade,
    unidade: m.unidade,
  }));

  const resultado = await gerarPdfMtrsPorClasse(empreendimentoNome, unidadeSinir, mtrsPorClasse);

  await logAuditoria(
    "DOWNLOAD",
    "SinirRelatorio",
    0,
    { acao: "mtrsPorClasse", conexao: conexao.nome, mtrs: manifestos.length },
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