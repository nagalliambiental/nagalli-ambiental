import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classeDeCodigoIbama, classeDeResiduos, consultarManifestoComRetry, listarCatalogos, type SinirConexaoCompleta } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const conexaoId = Number(body.conexaoId);
  if (!conexaoId) return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });

  const conexao = await prisma.sinirConexao.findUnique({ where: { id: conexaoId } });
  if (!conexao) return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });

  const mtrs = await prisma.sinirManifesto.findMany({
    where: {
      conexaoId,
      OR: [{ classeNome: null }, { classeNome: "" }, { classeNome: "Não identificada" }, { classeNome: "Não identificado" }],
    },
    orderBy: { dataExpedicao: "desc" },
    select: { id: true, numero: true, classeRisco: true },
  });

  const conexaoCompleta: SinirConexaoCompleta = {
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

  const atualizados: { id: number; numero: string; classeNome: string }[] = [];
  const falhas: { id: number; numero: string; erro: string }[] = [];
  let catalogos: Awaited<ReturnType<typeof listarCatalogos>> | null = null;
  try {
    catalogos = await listarCatalogos(conexaoCompleta);
  } catch {
    // A consulta individual continua sendo usada se o catálogo falhar.
  }

  for (const m of mtrs) {
    try {
      const codigo = String(m.classeRisco || "").replace(/\D/g, "");
      const catalogo = catalogos?.residuos.find((item) => item.resCodigoIbama.replace(/\D/g, "") === codigo);
      const classeCatalogo = classeDeCodigoIbama(m.classeRisco, catalogo?.resNome || "");
      if (classeCatalogo.classeNome) {
        await prisma.sinirManifesto.update({
          where: { id: m.id },
          data: { classeNome: classeCatalogo.classeNome, classeRisco: m.classeRisco },
        });
        atualizados.push({ id: m.id, numero: m.numero, classeNome: classeCatalogo.classeNome });
        continue;
      }

      const detalhe = await consultarManifestoComRetry(conexaoCompleta, m.numero);
      if (!detalhe) {
        falhas.push({ id: m.id, numero: m.numero, erro: "SINIR não retornou os resíduos" });
        continue;
      }
      const classe = classeDeResiduos(detalhe.residuos);
      if (!classe.classeNome) {
        falhas.push({ id: m.id, numero: m.numero, erro: "Classe ausente no detalhe do SINIR" });
        continue;
      }
      await prisma.sinirManifesto.update({
        where: { id: m.id },
        data: {
          classeNome: classe.classeNome,
          classeRisco: classe.resCodigoIbama || null,
          residuos: detalhe.residuos as never,
        },
      });
      atualizados.push({ id: m.id, numero: m.numero, classeNome: classe.classeNome });
    } catch (erro) {
      falhas.push({ id: m.id, numero: m.numero, erro: erro instanceof Error ? erro.message : "Erro ao consultar SINIR" });
    }
  }

  return NextResponse.json({
    total: mtrs.length,
    atualizados: atualizados.length,
    falhas: falhas.length,
    itens: atualizados,
    erros: falhas,
  });
}
