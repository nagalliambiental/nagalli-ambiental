import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { classeDeResiduos, consultarManifesto, gerarPdfMtrsPorClasse, type MtrPorClasseItem } from "@/lib/sinir";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = Number(req.nextUrl.searchParams.get("conexaoId"));
  const filtro = req.nextUrl.searchParams.get("filtro") || "recebidos";

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
  where.status = filtro === "recebidos" ? "RECEBIDO" : filtroStatus;
  if (filtro === "certificados") {
    where.certificado = true;
  }

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
    const letra = ident.letra || "D";
    const descSinir = ident.descricaoSinir
      ? `Classe ${ident.letra} (${ident.descricaoSinir})`
      : "Não identificada";

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

  const resultado = await gerarPdfMtrsPorClasse(empreendimentoNome, unidadeSinir, mtrsPorClasse);

  await logAuditoria(
    "DOWNLOAD",
    "SinirRelatorio",
    0,
    { acao: "mtrsPorClasse", conexao: conexao.nome, mtrs: manifestosLocais.length },
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
