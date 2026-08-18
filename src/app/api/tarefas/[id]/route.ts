import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: Number(id) },
    include: { responsavel: true, usuario: true },
  });
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  return NextResponse.json(tarefa);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

const { id } = await params;
  const body = await request.json();

  const atual = await prisma.tarefa.findUnique({ where: { id: Number(id) } });
  if (!atual) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const tarefa = await prisma.tarefa.update({
    where: { id: Number(id) },
    data: {
      titulo: body.titulo ?? atual.titulo,
      descricao: body.descricao !== undefined ? body.descricao ?? null : atual.descricao,
      status: body.status ?? atual.status,
      prioridade: body.prioridade ?? atual.prioridade,
      dataVencimento: body.dataVencimento !== undefined ? (body.dataVencimento ? new Date(body.dataVencimento) : null) : atual.dataVencimento,
      responsavelId: body.responsavelId !== undefined && body.responsavelId !== null && body.responsavelId !== "" ? Number(body.responsavelId) : atual.responsavelId,
      statusObs: body.statusObs !== undefined ? body.statusObs ?? null : atual.statusObs,
      ativo: body.ativo !== undefined ? Boolean(body.ativo) : atual.ativo,
    },
  });

  await logAuditoria("ATUALIZAR", "tarefa", tarefa.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(tarefa);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const tarefa = await prisma.tarefa.findUnique({ where: { id: Number(id) } });
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  await prisma.tarefa.delete({ where: { id: Number(id) } });
  await logAuditoria("EXCLUIR", "tarefa", Number(id), { titulo: tarefa.titulo }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Tarefa excluída" });
}
