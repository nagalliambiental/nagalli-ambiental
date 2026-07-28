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
    include: {
      orgao: true,
      empreendimento: { include: { cliente: true } },
      responsavel: true,
      exigencias: { orderBy: { prazo: "asc" } },
      documentos: true,
      timeline: { orderBy: { criadoEm: "asc" } },
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
  if (body.validade !== undefined) data.validade = body.validade ? new Date(body.validade) : null;
  if (body.condicionantes !== undefined) data.condicionantes = body.condicionantes || null;
  if (body.dataProtocolo !== undefined) data.dataProtocolo = body.dataProtocolo ? new Date(body.dataProtocolo) : null;
  if (body.dataContato !== undefined) data.dataContato = body.dataContato ? new Date(body.dataContato) : null;
  if (body.alertaDias !== undefined) data.alertaDias = Number(body.alertaDias);
  if (body.status !== undefined) data.status = body.status;
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

  await prisma.$transaction([
    prisma.timelineProcesso.deleteMany({ where: { processoId: Number(id) } }),
    prisma.documento.deleteMany({ where: { processoId: Number(id) } }),
    prisma.exigencia.deleteMany({ where: { processoId: Number(id) } }),
    prisma.processo.delete({ where: { id: Number(id) } }),
  ]);

  await logAuditoria("EXCLUIR", "processo", Number(id), { numProtocolo: proc.numProtocolo }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Processo excluído" });
}
