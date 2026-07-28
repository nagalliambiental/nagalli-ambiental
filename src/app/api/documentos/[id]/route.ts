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
  const doc = await prisma.documento.findUnique({
    where: { id: Number(id) },
    include: { processo: true, exigencia: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  return NextResponse.json(doc);
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

  const doc = await prisma.documento.update({
    where: { id: Number(id) },
    data: {
      nome: body.nome,
      tipo: body.tipo,
      processoId: body.processoId ? Number(body.processoId) : null,
      exigenciaId: body.exigenciaId ? Number(body.exigenciaId) : null,
    },
  });

  await logAuditoria("ATUALIZAR", "documento", doc.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(doc);
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

  const doc = await prisma.documento.findUnique({ where: { id: Number(id) } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  await prisma.documento.delete({ where: { id: Number(id) } });

  await logAuditoria("EXCLUIR", "documento", Number(id), { nome: doc.nome }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Documento excluído" });
}
