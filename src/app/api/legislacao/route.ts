import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const legislacoes = await prisma.legislacao.findMany({
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(legislacoes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const legislacao = await prisma.legislacao.create({ data });

    await logAuditoria(
      "criar",
      "legislacao",
      legislacao.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(legislacao, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar legislação" },
      { status: 400 }
    );
  }
}
