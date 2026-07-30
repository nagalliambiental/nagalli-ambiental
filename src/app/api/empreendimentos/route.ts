import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
export const dynamic = "force-static";

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
    if (data.clienteId) data.clienteId = Number(data.clienteId);
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

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const parsedIds = ids.split(",").map(Number);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.documento.deleteMany({ where: { processo: { empreendimentoId: { in: parsedIds } } } });
      await tx.exigencia.deleteMany({ where: { processo: { empreendimentoId: { in: parsedIds } } } });
      await tx.timelineProcesso.deleteMany({ where: { processo: { empreendimentoId: { in: parsedIds } } } });
      await tx.processo.deleteMany({ where: { empreendimentoId: { in: parsedIds } } });
      await tx.controleDmr.deleteMany({ where: { empreendimentoId: { in: parsedIds } } });
      await tx.empreendimento.deleteMany({ where: { id: { in: parsedIds } } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.empreendimento.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
