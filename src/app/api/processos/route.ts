import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const processos = await prisma.processo.findMany({
    include: {
      orgao: true,
      empreendimento: { include: { cliente: true } },
      responsavel: true,
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(processos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const usuarioId = Number((session.user as { id: string }).id);

    const processo = await prisma.processo.create({ data });

    await prisma.timelineProcesso.create({
      data: {
        status: "protocolado",
        descricao: "Processo protocolado",
        processoId: processo.id,
        usuarioId,
      },
    });

    await logAuditoria(
      "criar",
      "processo",
      processo.id,
      data,
      usuarioId
    );

    return NextResponse.json(processo, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar processo" },
      { status: 400 }
    );
  }
}
