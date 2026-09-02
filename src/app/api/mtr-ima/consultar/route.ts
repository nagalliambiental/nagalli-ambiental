import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consultarManifesto, MtrImaError } from "@/lib/mtr-ima";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { conexaoId, numero } = await req.json();
    if (!conexaoId || !numero) {
      return NextResponse.json({ error: "conexaoId e numero são obrigatórios" }, { status: 400 });
    }
    const resultado = await consultarManifesto(Number(conexaoId), String(numero));
    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof MtrImaError ? e.status : 500;
    const msg = e instanceof MtrImaError ? e.message : "Erro ao consultar MTR";
    return NextResponse.json({ error: msg }, { status });
  }
}
