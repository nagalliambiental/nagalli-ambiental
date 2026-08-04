import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const proposta = await prisma.propostaDemolicao.findUnique({ where: { id: Number(id) } });

  if (!proposta) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(proposta);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.propostaDemolicao.findUnique({ where: { id: Number(id) } });
  if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const isRevision = body.isRevision === true;

  const data = {
    engenheiroNome: body.engenheiroNome,
    empresaNome: body.empresaNome,
    bairro: body.bairro,
    cidade: body.cidade,
    uf: body.uf,
    quantidadePgrcc: Number(body.quantidadePgrcc) || 0,
    quantidadeRgrcc: Number(body.quantidadeRgrcc) || 0,
    valorUnitPgrcc: Number(body.valorUnitPgrcc) || 291.78,
    valorUnitRgrcc: Number(body.valorUnitRgrcc) || 291.78,
    percentualDesconto: Number(body.percentualDesconto) || 18,
    valorDesconto: body.valorDesconto ? Number(body.valorDesconto) : null,
    totalCalculado: body.totalCalculado ? Number(body.totalCalculado) : null,
    totalFinal: body.totalFinal ? Number(body.totalFinal) : null,
    observacoes: body.observacoes,
    revisao: isRevision ? existente.revisao + 1 : existente.revisao,
  };

  const proposta = await prisma.propostaDemolicao.update({
    where: { id: Number(id) },
    data,
  });

  await logAuditoria(isRevision ? "revisar" : "editar", "propostaDemolicao", proposta.id, data, userId);

  return NextResponse.json(proposta);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  const { id } = await params;

  await prisma.propostaDemolicao.delete({ where: { id: Number(id) } });
  await logAuditoria("excluir", "propostaDemolicao", Number(id), {}, userId);

  return NextResponse.json({ ok: true });
}