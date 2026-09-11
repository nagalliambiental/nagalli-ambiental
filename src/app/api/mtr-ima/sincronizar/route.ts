import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";
import { sincronizarManifestosConexao } from "@/lib/mtr-ima-portal";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let conexaoId: number | null = null;
  let anos = 10;
  try {
    const body = await req.json();
    conexaoId = body?.conexaoId ? Number(body.conexaoId) : null;
    if (body?.anos && Number(body.anos) > 0) anos = Number(body.anos);
  } catch {
    // corpo vazio: sincroniza todas
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
        resultados.push(await sincronizarManifestosConexao(c.id, anos));
      } catch (e) {
        erros.push({ conexaoId: c.id, mensagem: e instanceof MtrImaError ? e.message : "Erro ao sincronizar" });
      }
    }

    return NextResponse.json({ resultados, erros });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao sincronizar com o portal";
    return NextResponse.json({ error: msg }, { status: e instanceof MtrImaError && e.status >= 400 && e.status < 500 ? e.status : 500 });
  }
}