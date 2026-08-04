import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const condicionantes = await prisma.condicionante.findMany({
    include: {
      processo: {
        include: { empreendimento: true, orgao: true },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(condicionantes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();

    const condicionante = await prisma.condicionante.create({
      data: {
        descricao: data.descricao,
        status: data.status ?? "pendente",
        prazo: data.prazo ? new Date(data.prazo) : null,
        dataCumprimento: data.dataCumprimento ? new Date(data.dataCumprimento) : null,
        responsavel: data.responsavel ?? null,
        observacoes: data.observacoes ?? null,
        processoId: Number(data.processoId),
      },
    });

    await logAuditoria(
      "criar",
      "condicionante",
      condicionante.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(condicionante, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar condicionante" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  }

  try {
    await prisma.condicionante.deleteMany({
      where: { id: { in: ids.split(",").map(Number) } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao remover. Verifique se há registros vinculados." },
      { status: 400 }
    );
  }
}
