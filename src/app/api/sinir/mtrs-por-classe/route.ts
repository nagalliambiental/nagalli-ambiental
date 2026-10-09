import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { classeDeResiduos, consultarManifesto, gerarPdfMtrsPorClasse, trimestreCorrente, type MtrPorClasseItem } from "@/lib/sinir";

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

  const where: Record<string, unknown> = { conexaoId };
  if (filtro === "todos") where.status = { not: "CANCELADO" };
  else if (filtro === "pendentes") {
    where.status = { in: ["SALVO", "EMITIDO"] };
    where.certificado = false;
  } else if (filtro === "certificados") {
    where.certificado = true;
  } else if (filtro === "cancelados") where.status = "CANCELADO";
  else where.status = "RECEBIDO";

  const dataInicial = req.nextUrl.searchParams.get("dataInicial");
  const dataFinal = req.nextUrl.searchParams.get("dataFinal");
  let periodo: { inicio: Date; fim: Date; rotulo: string };
  if (dataInicial && dataFinal) {
    const inicio = new Date(`${dataInicial}T00:00:00`);
    const fim = new Date(`${dataFinal}T23:59:59`);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio > fim) {
      return NextResponse.json({ error: "Período inválido" }, { status: 400 });
    }
    periodo = { inicio, fim, rotulo: `${dataInicial} a ${dataFinal}` };
  } else {
    periodo = trimestreCorrente();
  }
  const { inicio, fim, rotulo } = periodo;
  where.dataExpedicao = { gte: inicio, lte: fim };

  const manifestosLocais = await prisma.sinirManifesto.findMany({
    where,
    orderBy: [{ dataExpedicao: "asc" }],
  });

  const empreendimentoNome = conexao.empreendimento?.apelido || conexao.nome;
  const unidadeSinir = conexao.empreendimento?.unidadeSinir || conexao.unidade;

  const mtrsPorClasse: MtrPorClasseItem[] = [];

  for (const m of manifestosLocais) {
    let residuos = m.residuos as unknown[];

    // Se o manifesto não tem resíduos salvos, consulta o SINIR individualmente e salva
    if (!Array.isArray(residuos) || residuos.length === 0) {
      try {
        const detalhe = await consultarManifesto(conexaoCompleta, m.numero);
        if (detalhe && Array.isArray(detalhe.residuos) && detalhe.residuos.length > 0) {
          residuos = detalhe.residuos;
          await prisma.sinirManifesto.update({
            where: { id: m.id },
            data: { residuos: residuos as never },
          });
        }
      } catch {
        // segue sem resíduo — cairá em "não identificado"
      }
    }

    const ident = classeDeResiduos(residuos);
    const letra = ident.letra || "N";
    const descSinir = ident.descricaoSinir
      ? `Classe ${ident.letra} (${ident.descricaoSinir})`
      : "Não identificada";

    if (classeFiltro && letra !== classeFiltro.toUpperCase()) continue;

    mtrsPorClasse.push({
      numero: m.numero,
      classeRisco: ident.resCodigoIbama || "",
      classeNome: letra,
      dataExpedicao: m.dataExpedicao,
      destinadorNome: m.destinadorNome,
      resDescricao: ident.resDescricao || null,
      descricaoSinir: descSinir,
      quantidade: m.quantidade,
      unidade: m.unidade,
    });
  }

  const resultado = await gerarPdfMtrsPorClasse(empreendimentoNome, unidadeSinir, mtrsPorClasse, { inicio, fim, rotulo });

  await logAuditoria(
    "DOWNLOAD",
    "SinirRelatorio",
    0,
    { acao: "mtrsPorClasse", conexao: conexao.nome, mtrs: manifestosLocais.length, periodo: rotulo },
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
