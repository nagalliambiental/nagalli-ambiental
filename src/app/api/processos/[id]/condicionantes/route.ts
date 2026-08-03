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
  const itens = await prisma.condicionante.findMany({
    where: { processoId: Number(id) },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(itens);
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
  const processoId = Number(id);
  const body = await request.json();
  const itens: { texto: string; atendida: boolean }[] = Array.isArray(body.itens) ? body.itens : [];

  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  const salvos = await prisma.$transaction(async (tx) => {
    await tx.condicionante.deleteMany({ where: { processoId } });
    if (itens.length === 0) return [];
    await tx.condicionante.createMany({
      data: itens
        .filter((item) => item.texto?.trim())
        .map((item, index) => ({
          processoId,
          ordem: index,
          texto: item.texto.trim(),
          atendida: Boolean(item.atendida),
        })),
    });
    return tx.condicionante.findMany({ where: { processoId }, orderBy: { ordem: "asc" } });
  });

  await logAuditoria("ATUALIZAR", "condicionantes", processoId, { total: salvos.length }, Number((session.user as { id: string }).id)).catch(() => {});

  return NextResponse.json(salvos);
}
