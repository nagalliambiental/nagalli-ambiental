import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const financeiros = await prisma.financeiro.findMany({
    include: { cliente: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(financeiros);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const financeiro = await prisma.financeiro.create({ data });

    await logAuditoria(
      "criar",
      "financeiro",
      financeiro.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(financeiro, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar registro financeiro" },
      { status: 400 }
    );
  }
}
