import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerPerfil } from "@/lib/perfil";
import { logAuditoria } from "@/lib/audit";


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

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
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

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

  await logAuditoria("ATUALIZAR", "financeiro", fin.id, body, Number(user.id));
  return NextResponse.json(fin);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const { id } = await params;

  const fin = await prisma.financeiro.findUnique({ where: { id: Number(id) } });
  if (!fin) {
    return NextResponse.json({ error: "Financeiro não encontrado" }, { status: 404 });
  }

  await prisma.financeiro.delete({ where: { id: Number(id) } });

  await logAuditoria("EXCLUIR", "financeiro", Number(id), { descricao: fin.descricao }, Number(user.id));
  return NextResponse.json({ mensagem: "Financeiro excluído" });
}
