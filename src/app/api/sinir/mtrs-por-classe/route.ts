import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { consultarClassePorResiduo, gerarPdfMtrsPorClasse } from "@/lib/sinir";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  const filtro = req.nextUrl.searchParams.get("filtro") || "recebidos";
  const classeFiltro = req.nextUrl.searchParams.get("classe") || "";

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

  const filtroStatus = (() => {
    switch (filtro) {
      case "pendentes": return { in: ["SALVO", "EMITIDO"] };
      case "certificados": return { equals: true };
      case "cancelados": return { in: ["CANCELADO"] };
      case "recebidos":
      default: return { equals: "RECEBIDO" };
    }
  })();

  const where: Record<string, unknown> = { conexaoId };
  if (filtro !== "recebidos") {
    where.status = filtroStatus;
  } else {
    where.status = "RECEBIDO";
  }
  if (filtro === "certificados") {
    where.certificado = true;
  }

  const manifestosLocais = await prisma.sinirManifesto.findMany({
    where,
    orderBy: [{ destinadorNome: "asc" }, { dataExpedicao: "asc" }],
  });

  const empreendimentoNome = conexao.empreendimento?.apelido || conexao.nome;
  const unidadeSinir = conexao.empreendimento?.unidadeSinir || conexao.unidade;

  const mtrsPorClasse: MtrPorClasseItem[] = [];

  for (const m of manifestosLocais) {
    let classeNome = "Não identificado";
    let classeRisco = "";

    const residuos = (m.residuos as unknown as Array<Record<string, unknown>>) || [];
    if (residuos.length > 0) {
      const primeiroResiduo = residuos[0];
      const resCodigoIbama = (primeiroResiduo.resCodigoIbama as string) || (primeiroResiduo.resCodigo as string) || "";

      if (resCodigoIbama) {
        const classe = await consultarClassePorResiduo(conexaoCompleta, resCodigoIbama);
        classeNome = classe;
        classeRisco = resCodigoIbama;
      }
    }

    // Aplica filtro de classe se especificado
    if (classeFiltro && classeNome !== classeFiltro) {
      continue;
    }

    mtrsPorClasse.push({
      numero: m.numero,
      classeRisco,
      classeNome,
      dataExpedicao: m.dataExpedicao,
      destinadorNome: m.destinadorNome,
      quantidade: m.quantidade,
      unidade: m.unidade,
    });
  }

  const resultado = await gerarPdfMtrsPorClasse(empreendimentoNome, unidadeSinir, mtrsPorClasse);

  await logAuditoria(
    "DOWNLOAD",
    "SinirRelatorio",
    0,
    { acao: "mtrsPorClasse", conexao: conexao.nome, mtrs: manifestosLocais.length, filtroClasse: classeFiltro || "todas" },
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

interface MtrPorClasseItem {
  numero: string;
  classeRisco: string;
  classeNome: string;
  dataExpedicao: Date | null;
  destinadorNome: string | null;
  quantidade?: number | null;
  unidade?: string | null;
}