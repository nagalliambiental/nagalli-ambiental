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

  const atual = await prisma.exigencia.findUnique({ where: { id: Number(id) } });
  if (!atual) {
    return NextResponse.json({ error: "Exigência não encontrada" }, { status: 404 });
  }

  const cumprida = body.cumprida === true || body.cumprida === "true";

  const exigencia = await prisma.exigencia.update({
    where: { id: Number(id) },
    data: {
      descricao: body.descricao ?? atual.descricao,
      prazo: body.prazo ? new Date(body.prazo) : atual.prazo,
      antecedenciaDias: body.antecedenciaDias !== undefined ? Number(body.antecedenciaDias) : atual.antecedenciaDias,
      cumprida: body.cumprida !== undefined ? cumprida : atual.cumprida,
      processoId: body.processoId !== undefined ? Number(body.processoId) : atual.processoId,
      ativo: body.ativo !== undefined ? Boolean(body.ativo) : atual.ativo,
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
