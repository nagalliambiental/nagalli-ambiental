import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { conexaoId, numero, dataInicial, dataFinal } = await req.json();
    const where: Record<string, unknown> = {};
    if (conexaoId) where.conexaoId = Number(conexaoId);
    if (numero) where.numero = String(numero);
    if (dataInicial || dataFinal) {
      const exp: Record<string, unknown> = {};
      if (dataInicial && /^\d{4}-\d{2}-\d{2}/.test(String(dataInicial))) {
        exp.gte = new Date(`${String(dataInicial).slice(0, 10)}T00:00:00.000Z`);
      }
      if (dataFinal && /^\d{4}-\d{2}-\d{2}/.test(String(dataFinal))) {
        const fim = new Date(`${String(dataFinal).slice(0, 10)}T00:00:00.000Z`);
        fim.setUTCDate(fim.getUTCDate() + 1);
        exp.lt = fim;
      }
      if (Object.keys(exp).length > 0) where.dataExpedicao = exp;
    }

    const manifestos = await prisma.mtrImaManifesto.findMany({
      where,
      include: { conexao: { select: { id: true, nome: true, cnpj: true, unidade: true } } },
      orderBy: { dataExpedicao: "desc" },
    });

    return NextResponse.json(manifestos);
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao listar manifestos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
