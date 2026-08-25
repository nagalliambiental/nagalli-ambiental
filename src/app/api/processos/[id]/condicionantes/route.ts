import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const itens = await prisma.condicionante.findMany({
    where: { processoId: Number(id) },
    orderBy: [{ ordem: "asc" }, { id: "asc" }],
    include: { documentos: { select: { id: true, nome: true, tamanho: true, criadoEm: true } } },
  });
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);
  const body = await req.json().catch(() => null);
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  if (!titulo) return NextResponse.json({ error: "Informe o resumo da condicionante" }, { status: 400 });

  const ultima = await prisma.condicionante.findFirst({
    where: { processoId },
    orderBy: [{ ordem: "desc" }],
    select: { ordem: true },
  });

  const item = await prisma.condicionante.create({
    data: {
      processoId,
      titulo: titulo.slice(0, 200),
      descricao: body?.descricao ? String(body.descricao).slice(0, 1000) : null,
      ordem: (ultima?.ordem ?? 0) + 1,
      origem: "manual",
    },
  });

  await logAuditoria("criar", "Condicionante", item.id, { titulo: item.titulo, processoId });
  return NextResponse.json(item, { status: 201 });
}
