import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { consultarManifesto, consultarTodosManifestos, SINIR_TIPOS_PARCEIRO } from "@/lib/sinir";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { conexaoId, dataInicial, dataFinal, incluirClasses = true } = body;
  if (!conexaoId) {
    return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.findUnique({
    where: { id: Number(conexaoId) },
  });
  if (!conexao) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }
  if (!conexao.ativo) {
    return NextResponse.json({ error: "Conexão inativa" }, { status: 400 });
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let fim: Date;
  let inicio: Date;
  if (dataInicial && dataFinal) {
    const dI = new Date(`${dataInicial}T00:00:00`);
    const dF = new Date(`${dataFinal}T23:59:59`);
    if (isNaN(dI.getTime()) || isNaN(dF.getTime()) || dI > dF) {
      return NextResponse.json({ error: "Período de consulta inválido — dataInicial deve ser anterior a dataFinal" }, { status: 400 });
    }
    inicio = dI;
    fim = dF;
  } else {
    fim = new Date();
    inicio = new Date(fim.getTime() - 29 * 86400000);
  }
  const dataInicialFmt = iso(inicio);
  const dataFinalFmt = iso(fim);

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

  let manifestos;
  try {
    manifestos = await consultarTodosManifestos(conexaoCompleta, { dataInicial: dataInicialFmt, dataFinal: dataFinalFmt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao consultar manifestos no SINIR" },
      { status: 502 }
    );
  }

  await prisma.sinirConexao.update({
    where: { id: conexao.id },
    data: { ultimoUsoEm: new Date() },
  });

  type ManifestoEnriquecido = (typeof manifestos)[number] & {
    id: number;
    conexao: { id: number; nome: string; modo: string };
  };
  const itens: ManifestoEnriquecido[] = [];
  for (const m of manifestos) {
    let classeNome = m.classeNome;
    let classeRisco = m.classeRisco;
    let residuos = m.residuos;

    // A consulta em lote não traz resíduos/classe. Busca o detalhe apenas
    // quando solicitado e quando a classe ainda não está persistida.
    if (incluirClasses && (!classeNome || classeNome === "Não identificado")) {
      try {
        const detalhe = await consultarManifesto(conexaoCompleta, m.numero);
        if (detalhe) {
          classeNome = detalhe.classeNome;
          classeRisco = detalhe.classeRisco || classeRisco;
          residuos = detalhe.residuos;
        }
      } catch {
        // O MTR continua disponível mesmo se o detalhe individual falhar.
      }
    }

    // A consulta em lote não retorna resíduos/classe — preserva o que já está no banco
    const temClasseNova = Boolean(classeNome) && classeNome !== "Não identificado";
    const dadosClasseUpdate = temClasseNova
      ? { classeRisco, classeNome }
      : {};
    const salvo = await prisma.sinirManifesto.upsert({
      where: { conexaoId_numero: { conexaoId: conexao.id, numero: m.numero } },
      create: {
        conexaoId: conexao.id,
        numero: m.numero,
        status: m.status,
        certificado: m.certificado,
        cdfNumero: m.cdfNumero ?? null,
        clienteNome: m.clienteNome,
        empreendNome: m.empreendNome,
        transportadorNome: m.transportadorNome,
        destinadorNome: m.destinadorNome,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        dataExpedicao: m.dataExpedicao,
        dataRecebimento: m.dataRecebimento,
        classeRisco,
        classeNome: classeNome === "Não identificado" ? null : classeNome,
        ...(residuos ? { residuos: residuos as never } : {}),
      },
      update: {
        status: m.status,
        certificado: m.certificado,
        ...(m.cdfNumero ? { cdfNumero: m.cdfNumero } : {}),
        clienteNome: m.clienteNome,
        empreendNome: m.empreendNome,
        transportadorNome: m.transportadorNome,
        destinadorNome: m.destinadorNome,
        resumo: m.resumo,
        quantidade: m.quantidade,
        unidade: m.unidade,
        dataExpedicao: m.dataExpedicao,
        dataRecebimento: m.dataRecebimento,
        ...dadosClasseUpdate,
        ...(residuos ? { residuos: residuos as never } : {}),
      },
    });
    itens.push({
      ...m,
      classeNome: salvo.classeNome || classeNome || "Não identificado",
      classeRisco: classeRisco || salvo.classeRisco || "",
      cdfNumero: m.cdfNumero || salvo.cdfNumero || undefined,
      id: salvo.id,
      conexao: { id: conexao.id, nome: conexao.nome, modo: conexao.modo },
    });
  }

  await logAuditoria(
    "ATUALIZAR",
    "SinirConexao",
    conexao.id,
    {
      acao: "meus-mtrs",
      conexao: conexao.nome,
      periodo: `${dataInicialFmt} a ${dataFinalFmt}`,
      papeis: SINIR_TIPOS_PARCEIRO.map((p) => `${p.rotulo}=${p.valor}`).join(", "),
      encontrados: manifestos.length,
    },
    session.user?.id ? Number(session.user.id) : undefined
  );

  const pendentes = itens.filter((m) => !m.certificado && m.status !== "CANCELADO");

  return NextResponse.json({
    conexao: { id: conexao.id, nome: conexao.nome, modo: conexao.modo },
    periodo: { dataInicial: dataInicialFmt, dataFinal: dataFinalFmt },
    papeis: SINIR_TIPOS_PARCEIRO.map((p) => p.rotulo),
    total: itens.length,
    pendentes: pendentes.length,
    manifestos: itens,
  });
}
