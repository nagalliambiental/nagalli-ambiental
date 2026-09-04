import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const proc = await prisma.processo.findUnique({
    where: { id: Number(id) },
    select: {
      id: true, numProtocolo: true, numLicenca: true, tipo: true, sistema: true,
      status: true, validade: true, dataProtocolo: true, dataContato: true,
      alertaDias: true, condicionantes: true, observacoes: true, criadoEm: true, atualizadoEm: true,
      atividade: true, municipio: true,
      empreendimentoId: true, orgaoId: true, responsavelId: true,
      orgao: { select: { id: true, sigla: true, nome: true } },
      empreendimento: {
        select: {
          id: true, apelido: true, municipio: true, uf: true,
          cliente: { select: { id: true, apelido: true, razaoSocial: true } },
        },
      },
      responsavel: { select: { id: true, nome: true, email: true, telefone: true } },
      exigencias: {
        orderBy: { prazo: "asc" },
        select: {
          id: true, descricao: true, prazo: true, cumprida: true,
          antecedenciaDias: true, criadoEm: true, processoId: true,
        },
      },
      documentos: {
        select: {
          id: true, nome: true, tipo: true, caminho: true, tamanho: true, criadoEm: true,
        },
      },
      timeline: {
        orderBy: { criadoEm: "asc" },
        select: {
          id: true, status: true, descricao: true, criadoEm: true, usuarioId: true,
        },
      },
      autorizacaoCorte: true,
      _count: { select: { exigencias: true, documentos: true } },
    },
  });

  if (!proc) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  return NextResponse.json(proc);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.tipo !== undefined) data.tipo = body.tipo;
  if (body.orgaoId !== undefined) data.orgaoId = Number(body.orgaoId);
  if (body.sistema !== undefined) data.sistema = body.sistema;
  if (body.numProtocolo !== undefined) data.numProtocolo = body.numProtocolo;
  if (body.numLicenca !== undefined) data.numLicenca = body.numLicenca || null;
  if (body.atividade !== undefined) data.atividade = body.atividade || null;
  if (body.municipio !== undefined) data.municipio = body.municipio || null;
  if (body.validade !== undefined) data.validade = body.validade ? new Date(body.validade) : null;
  if (body.condicionantes !== undefined) data.condicionantes = body.condicionantes || null;
  if (body.dataProtocolo !== undefined) data.dataProtocolo = body.dataProtocolo ? new Date(body.dataProtocolo) : null;
  if (body.dataContato !== undefined) data.dataContato = body.dataContato ? new Date(body.dataContato) : null;
  if (body.alertaDias !== undefined) data.alertaDias = Number(body.alertaDias);
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "encerrado") {
      data.renovacaoPendente = true;
    } else if (body.renovacaoPendente === undefined) {
      data.renovacaoPendente = false;
    }
  }
  if (body.renovacaoPendente !== undefined) data.renovacaoPendente = Boolean(body.renovacaoPendente);
  if (body.empreendimentoId !== undefined) data.empreendimentoId = Number(body.empreendimentoId);
  if (body.responsavelId !== undefined) data.responsavelId = body.responsavelId ? Number(body.responsavelId) : null;
  if (body.observacoes !== undefined) data.observacoes = body.observacoes || null;

  const proc = await prisma.processo.update({
    where: { id: Number(id) },
    data,
  });

  await logAuditoria("ATUALIZAR", "processo", proc.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(proc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const proc = await prisma.processo.findUnique({ where: { id: Number(id) } });
  if (!proc) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  try {
    const pId = Number(id);

    const exigenciaIds = (await prisma.exigencia.findMany({
      where: { processoId: pId },
      select: { id: true },
    })).map((e) => e.id);

    await prisma.$transaction([
      prisma.documento.deleteMany({ where: { OR: [{ processoId: pId }, { exigenciaId: { in: exigenciaIds } }] } }),
      prisma.timelineProcesso.deleteMany({ where: { processoId: pId } }),
      prisma.alerta.deleteMany({ where: { processoId: pId } }),
      prisma.financeiro.deleteMany({ where: { processoId: pId } }),
      prisma.exigencia.deleteMany({ where: { id: { in: exigenciaIds } } }),
      prisma.processo.delete({ where: { id: pId } }),
    ]);

    await logAuditoria("EXCLUIR", "processo", Number(id), { numProtocolo: proc.numProtocolo }, Number((session.user as { id: string }).id)).catch(() => {});
    return NextResponse.json({ mensagem: "Processo excluído" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao excluir processo:", message);
    return NextResponse.json({ error: `Erro ao excluir processo: ${message}` }, { status: 500 });
  }
}
