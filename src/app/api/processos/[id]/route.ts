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

  const proc = await prisma.processo.update({
    where: { id: Number(id) },
    data: {
      tipo: body.tipo,
      orgaoId: Number(body.orgaoId),
      sistema: body.sistema,
      numProtocolo: body.numProtocolo,
      numLicenca: body.numLicenca ?? null,
      validade: body.validade ? new Date(body.validade) : null,
      condicionantes: body.condicionantes ?? null,
      status: body.status,
      empreendimentoId: Number(body.empreendimentoId),
      responsavelId: body.responsavelId ? Number(body.responsavelId) : null,
      observacoes: body.observacoes ?? null,
    },
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

  await prisma.processo.delete({ where: { id: Number(id) } });

  await logAuditoria("EXCLUIR", "processo", Number(id), { numProtocolo: proc.numProtocolo }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Processo excluído" });
}
