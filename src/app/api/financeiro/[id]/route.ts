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
  const fin = await prisma.financeiro.findUnique({
    where: { id: Number(id) },
    include: { cliente: true },
  });

  if (!fin) {
    return NextResponse.json({ error: "Financeiro não encontrado" }, { status: 404 });
  }

  return NextResponse.json(fin);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfilLogado = (session.user as { perfil?: string }).perfil;
  if (perfilLogado !== "socio") {
    return NextResponse.json({ error: "Apenas sócios podem alterar financeiro" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const fin = await prisma.financeiro.update({
    where: { id: Number(id) },
    data: {
      tipoCobranca: body.tipoCobranca,
      valor: Number(body.valor),
      formaPagamento: body.formaPagamento,
      statusPagamento: body.statusPagamento,
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
      dataPagamento: body.dataPagamento ? new Date(body.dataPagamento) : null,
      descricao: body.descricao ?? null,
      clienteId: Number(body.clienteId),
    },
  });

  await logAuditoria("ATUALIZAR", "financeiro", fin.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(fin);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfilLogado = (session.user as { perfil?: string }).perfil;
  if (perfilLogado !== "socio") {
    return NextResponse.json({ error: "Apenas sócios podem excluir financeiro" }, { status: 403 });
  }

  const { id } = await params;

  const fin = await prisma.financeiro.findUnique({ where: { id: Number(id) } });
  if (!fin) {
    return NextResponse.json({ error: "Financeiro não encontrado" }, { status: 404 });
  }

  await prisma.financeiro.delete({ where: { id: Number(id) } });

  await logAuditoria("EXCLUIR", "financeiro", Number(id), { descricao: fin.descricao }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Financeiro excluído" });
}
