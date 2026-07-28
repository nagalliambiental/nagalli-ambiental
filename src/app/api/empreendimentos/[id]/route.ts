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
  const emp = await prisma.empreendimento.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: true,
      processos: {
        include: { orgao: true },
        orderBy: { criadoEm: "desc" },
      },
    },
  });

  if (!emp) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  return NextResponse.json(emp);
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

  const emp = await prisma.empreendimento.update({
    where: { id: Number(id) },
    data: {
      apelido: body.apelido,
      endereco: body.endereco,
      descricao: body.descricao,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      poligono: body.poligono ?? null,
      clienteId: Number(body.clienteId),
    },
  });

  await logAuditoria("ATUALIZAR", "empreendimento", emp.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(emp);
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

  const emp = await prisma.empreendimento.findUnique({ where: { id: Number(id) } });
  if (!emp) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  const processoIds = (await prisma.processo.findMany({
    where: { empreendimentoId: Number(id) },
    select: { id: true },
  })).map((p) => p.id);

  await prisma.$transaction([
    prisma.timelineProcesso.deleteMany({ where: { processoId: { in: processoIds } } }),
    prisma.documento.deleteMany({ where: { processoId: { in: processoIds } } }),
    prisma.exigencia.deleteMany({ where: { processoId: { in: processoIds } } }),
    prisma.processo.deleteMany({ where: { id: { in: processoIds } } }),
    prisma.empreendimento.delete({ where: { id: Number(id) } }),
  ]);

  await logAuditoria("EXCLUIR", "empreendimento", Number(id), { apelido: emp.apelido }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Empreendimento excluído" });
}
