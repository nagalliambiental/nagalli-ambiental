import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { cancelarManifesto, MtrImaError } from "@/lib/mtr-ima";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { conexaoId, numero, justificativa } = await req.json();
    if (!conexaoId || !numero || !justificativa) {
      return NextResponse.json({ error: "conexaoId, numero e justificativa são obrigatórios" }, { status: 400 });
    }
    const resultado = await cancelarManifesto(Number(conexaoId), String(numero), justificativa);
    await logAuditoria(
      "ATUALIZAR",
      "MtrImaManifesto",
      Number(conexaoId),
      { acao: "cancelar", numero: String(numero), mensagem: resultado.mensagem },
      session.user?.id ? Number(session.user.id) : undefined
    );
    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof MtrImaError ? e.status : 500;
    const msg = e instanceof MtrImaError ? e.message : "Erro ao cancelar";
    return NextResponse.json({ error: msg }, { status });
  }
}
