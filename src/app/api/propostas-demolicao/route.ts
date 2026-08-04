import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const propostas = await prisma.propostaDemolicao.findMany({
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
  });

  return NextResponse.json(propostas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  const body = await req.json();

  const anoAtual = new Date().getFullYear();

  const ultimaProposta = await prisma.propostaDemolicao.findFirst({
    where: { ano: anoAtual },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const proximoNumero = (ultimaProposta?.numero ?? 0) + 1;

  const data = {
    numero: proximoNumero,
    ano: anoAtual,
    revisao: 0,
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
  };

  const proposta = await prisma.propostaDemolicao.create({ data });

  await logAuditoria("criar", "propostaDemolicao", proposta.id, data, userId);

  return NextResponse.json(proposta, { status: 201 });
}