import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
export const dynamic = "force-static";

export function generateStaticParams() { return []; }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const exigencia = await prisma.exigencia.findUnique({
    where: { id: Number(id) },
    include: {
      processo: { include: { orgao: true, empreendimento: true } },
      documentos: true,
    },
  });

  if (!exigencia) {
    return NextResponse.json({ error: "Exigência não encontrada" }, { status: 404 });
  }

  return NextResponse.json(exigencia);
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

  const exigencia = await prisma.exigencia.update({
    where: { id: Number(id) },
    data: {
      descricao: body.descricao,
      prazo: new Date(body.prazo),
      antecedenciaDias: Number(body.antecedenciaDias),
      cumprida: body.cumprida ?? false,
      processoId: Number(body.processoId),
    },
  });

  await logAuditoria("ATUALIZAR", "exigencia", exigencia.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(exigencia);
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

  const exigencia = await prisma.exigencia.findUnique({ where: { id: Number(id) } });
  if (!exigencia) {
    return NextResponse.json({ error: "Exigência não encontrada" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.documento.deleteMany({ where: { exigenciaId: Number(id) } }),
    prisma.exigencia.delete({ where: { id: Number(id) } }),
  ]);

  await logAuditoria("EXCLUIR", "exigencia", Number(id), { descricao: exigencia.descricao }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Exigência excluída" });
}
