import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";
import { importarModelosPortal } from "@/lib/mtr-ima-portal";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let conexaoId: number | null = null;
  try {
    const body = await req.json();
    conexaoId = body?.conexaoId ? Number(body.conexaoId) : null;
  } catch {
    // corpo vazio: importa todas
  }

  try {
    const conexoes =
      conexaoId != null
        ? [{ id: conexaoId }]
        : await prisma.mtrImaConexao.findMany({ where: { ativo: true }, select: { id: true } });

    if (conexoes.length === 0) return NextResponse.json({ resultados: [], erros: [] });

    const resultados = [];
    const erros = [];
    for (const c of conexoes) {
      try {
        resultados.push(await importarModelosPortal(c.id));
      } catch (e) {
        erros.push({ conexaoId: c.id, mensagem: e instanceof MtrImaError ? e.message : "Erro ao importar modelos" });
      }
    }

    return NextResponse.json({ resultados, erros });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao importar modelos do portal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
