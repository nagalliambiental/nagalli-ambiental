import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { conexaoId, numero } = await req.json();
    const where: Record<string, unknown> = {};
    if (conexaoId) where.conexaoId = Number(conexaoId);
    if (numero) where.numero = String(numero);

    const manifestos = await prisma.mtrImaManifesto.findMany({
      where,
      include: { conexao: { select: { id: true, nome: true, cnpj: true } } },
      orderBy: { dataExpedicao: "desc" },
    });

    return NextResponse.json(manifestos);
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao listar manifestos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
