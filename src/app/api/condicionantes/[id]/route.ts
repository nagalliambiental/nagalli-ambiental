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

  const condicionante = await prisma.condicionante.findUnique({
    where: { id: Number(id) },
    include: {
      processo: {
        include: { empreendimento: true, orgao: true },
      },
    },
  });

  if (!condicionante) {
    return NextResponse.json(
      { error: "Condicionante não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(condicionante);
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

  const condicionante = await prisma.condicionante.update({
    where: { id: Number(id) },
    data: {
      descricao: body.descricao,
      status: body.status,
      prazo: body.prazo ? new Date(body.prazo) : null,
      dataCumprimento: body.dataCumprimento ? new Date(body.dataCumprimento) : null,
      responsavel: body.responsavel ?? null,
      observacoes: body.observacoes ?? null,
      processoId: Number(body.processoId),
    },
  });

  await logAuditoria(
    "ATUALIZAR",
    "condicionante",
    condicionante.id,
    body,
    Number((session.user as { id: string }).id)
  );

  return NextResponse.json(condicionante);
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

  const condicionante = await prisma.condicionante.findUnique({
    where: { id: Number(id) },
  });

  if (!condicionante) {
    return NextResponse.json(
      { error: "Condicionante não encontrada" },
      { status: 404 }
    );
  }

  await prisma.condicionante.delete({ where: { id: Number(id) } });

  await logAuditoria(
    "EXCLUIR",
    "condicionante",
    Number(id),
    { descricao: condicionante.descricao },
    Number((session.user as { id: string }).id)
  );

  return NextResponse.json({ mensagem: "Condicionante excluída" });
}
