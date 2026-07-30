import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
export const dynamic = "force-static";

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

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.tarefa.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.tarefa.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
