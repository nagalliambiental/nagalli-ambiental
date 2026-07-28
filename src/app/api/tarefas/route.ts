import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tarefas = await prisma.tarefa.findMany({
    include: { responsavel: true, usuario: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(tarefas);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const tarefa = await prisma.tarefa.create({ data });

    await logAuditoria(
      "criar",
      "tarefa",
      tarefa.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(tarefa, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar tarefa" },
      { status: 400 }
    );
  }
}
