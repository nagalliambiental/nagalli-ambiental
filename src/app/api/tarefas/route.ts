import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tarefas = await prisma.tarefa.findMany({
    include: {
      responsavel: { select: { id: true, nome: true } },
      usuario: { select: { id: true, nome: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
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
    const tarefa = await prisma.tarefa.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        status: data.status ?? "pendente",
        prioridade: data.prioridade ?? "media",
        prazoFinal: data.prazoFinal ? new Date(data.prazoFinal) : null,
        alertaPrazoFinal: Number(data.alertaPrazoFinal ?? 30),
        dataLimite: data.dataLimite ? new Date(data.dataLimite) : null,
        alertaDataLimite: Number(data.alertaDataLimite ?? 30),
        responsavelId: Number(data.responsavelId),
        empreendimentoId: data.empreendimentoId ? Number(data.empreendimentoId) : null,
        usuarioId: data.usuarioId
          ? Number(data.usuarioId)
          : Number((session.user as { id: string }).id),
      },
    });

    await logAuditoria(
      "criar",
      "tarefa",
      tarefa.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(tarefa, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
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
    console.error("Erro ao remover tarefas:", e);
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
