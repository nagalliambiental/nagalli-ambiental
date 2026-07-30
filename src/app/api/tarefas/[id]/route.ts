import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
export const dynamic = "force-static";

export function generateStaticParams() { return []; }

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

  const tarefa = await prisma.tarefa.update({
    where: { id: Number(id) },
    data: {
      titulo: body.titulo,
      descricao: body.descricao ?? null,
      status: body.status,
      prioridade: body.prioridade,
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
      responsavelId: Number(body.responsavelId),
      statusObs: body.statusObs ?? null,
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
