import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { getModeloProposta } from "@/lib/propostas/modelos-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const propostas = await prisma.propostaServico.findMany({
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
  });

  return NextResponse.json(propostas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  const body = await req.json();

  const modeloSlug = body.modeloSlug;
  if (!(await getModeloProposta(modeloSlug))) {
    return NextResponse.json({ error: "Modelo de proposta não encontrado" }, { status: 400 });
  }

  const anoAtual = new Date().getFullYear();

  const ultimaProposta = await prisma.propostaServico.findFirst({
    where: { ano: anoAtual },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const proximoNumero = (ultimaProposta?.numero ?? 0) + 1;

  const data = {
    modeloSlug,
    numero: proximoNumero,
    ano: anoAtual,
    revisao: 0,
    dados: body.dados ?? {},
  };

  const proposta = await prisma.propostaServico.create({ data });

  await logAuditoria("criar", "propostaServico", proposta.id, data, userId);

  return NextResponse.json(proposta, { status: 201 });
}
