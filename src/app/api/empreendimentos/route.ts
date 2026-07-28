import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const empreendimentos = await prisma.empreendimento.findMany({
    include: { cliente: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(empreendimentos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const empreendimento = await prisma.empreendimento.create({ data });

    await logAuditoria(
      "criar",
      "empreendimento",
      empreendimento.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(empreendimento, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar empreendimento" },
      { status: 400 }
    );
  }
}
