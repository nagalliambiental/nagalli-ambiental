import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const exigencias = await prisma.exigencia.findMany({
    include: { processo: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(exigencias);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const exigencia = await prisma.exigencia.create({ data });

    await logAuditoria(
      "criar",
      "exigencia",
      exigencia.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(exigencia, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar exigência" },
      { status: 400 }
    );
  }
}
