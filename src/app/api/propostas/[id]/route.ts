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
  const proposta = await prisma.proposta.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { id: true, apelido: true, razaoSocial: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });

  if (!proposta) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  return NextResponse.json(proposta);
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

  const atual = await prisma.proposta.findUnique({
    where: { id: Number(id) },
  });
  if (!atual) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  const proposta = await prisma.proposta.update({
    where: { id: Number(id) },
    data: {
      titulo: body.titulo !== undefined ? String(body.titulo) : atual.titulo,
      clienteId: body.clienteId !== undefined ? Number(body.clienteId) : atual.clienteId,
      empreendimentoId: body.empreendimentoId !== undefined
        ? body.empreendimentoId !== null ? Number(body.empreendimentoId) : null
        : atual.empreendimentoId,
      valor: body.valor !== undefined
        ? body.valor !== null ? Number(body.valor) : null
        : atual.valor,
      status: body.status !== undefined ? String(body.status) : atual.status,
      validadeDias: body.validadeDias !== undefined ? Number(body.validadeDias) : atual.validadeDias,
      servicos: body.servicos !== undefined ? body.servicos : atual.servicos,
      observacoes: body.observacoes !== undefined
        ? body.observacoes !== null ? String(body.observacoes) : null
        : atual.observacoes,
    },
    include: {
      cliente: { select: { id: true, apelido: true, razaoSocial: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });

  await logAuditoria("atualizar", "proposta", proposta.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(proposta);
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

  const proposta = await prisma.proposta.findUnique({ where: { id: Number(id) } });
  if (!proposta) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  await prisma.proposta.delete({ where: { id: Number(id) } });

  await logAuditoria("excluir", "proposta", Number(id), { titulo: proposta.titulo }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Proposta excluída" });
}
