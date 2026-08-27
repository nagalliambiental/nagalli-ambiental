import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const processos = await prisma.processo.findMany({
    select: {
      id: true, numProtocolo: true, numLicenca: true, tipo: true, sistema: true,
      status: true, validade: true, dataProtocolo: true, alertaDias: true, criadoEm: true,
      atividade: true, municipio: true,
      empreendimentoId: true, orgaoId: true, responsavelId: true,
      orgao: { select: { id: true, sigla: true } },
      empreendimento: { select: { id: true, apelido: true, cliente: { select: { id: true, apelido: true } } } },
      responsavel: { select: { id: true, nome: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(processos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const usuarioId = Number((session.user as { id: string }).id);

    const { autorizacaoCorte, orgaoOutro, ...raw } = data;

    const nomeOrgaoOutro = orgaoOutro ? String(orgaoOutro).trim() : "";
    let orgaoId = raw.orgaoId ? Number(raw.orgaoId) : NaN;
    if (nomeOrgaoOutro) {
      const sigla = nomeOrgaoOutro.toUpperCase();
      const orgao = await prisma.orgao.upsert({
        where: { sigla },
        update: { nome: sigla },
        create: { sigla, nome: sigla },
      });
      orgaoId = orgao.id;
    }
    if (!Number.isInteger(orgaoId) || orgaoId <= 0) {
      return NextResponse.json({ error: "Órgão inválido" }, { status: 400 });
    }

    const processo = await prisma.processo.create({
      data: {
        tipo: String(raw.tipo),
        orgaoId,
        sistema: String(raw.sistema),
        numProtocolo: String(raw.numProtocolo),
        status: (raw.status as string) || "protocolado",
        validade: raw.validade ? new Date(raw.validade) : null,
        empreendimentoId: Number(raw.empreendimentoId),
        responsavelId: raw.responsavelId ? Number(raw.responsavelId) : null,
        observacoes: raw.observacoes || null,
        numLicenca: raw.numLicenca || null,
        atividade: raw.atividade || null,
        municipio: raw.municipio || null,
        condicionantes: raw.condicionantes || null,
        dadosEmpreendimento: raw.dadosEmpreendimento || null,
        dataProtocolo: raw.dataProtocolo ? new Date(raw.dataProtocolo) : null,
        dataContato: raw.dataContato ? new Date(raw.dataContato) : null,
        alertaDias: Number(raw.alertaDias) || 30,
      },
    });

    if (autorizacaoCorte) {
      await prisma.autorizacaoCorte.create({
        data: {
          processoId: processo.id,
          quantidadeIndividuos: autorizacaoCorte.quantidadeIndividuos ?? null,
          compensacaoExigida: autorizacaoCorte.compensacaoExigida ?? false,
          tipoCompensacao: autorizacaoCorte.tipoCompensacao ?? null,
          quantidadeMudas: autorizacaoCorte.quantidadeMudas ?? null,
          areaCompensacaoM2: autorizacaoCorte.areaCompensacaoM2 ?? null,
          prazoCompensacao: autorizacaoCorte.prazoCompensacao ? new Date(autorizacaoCorte.prazoCompensacao) : null,
        },
      });
    }

    const status = (raw.status as string) || "protocolado";
    await prisma.timelineProcesso.create({
      data: {
        status,
        descricao: `Licença ${status}`,
        processoId: processo.id,
        usuarioId,
      },
    });

    await logAuditoria(
      "criar",
      "processo",
      processo.id,
      data,
      usuarioId
    );

    return NextResponse.json(processo, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar processo:", error);
    return NextResponse.json(
      { error: "Erro ao criar processo" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.processo.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao remover processos:", e);
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.processo.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
