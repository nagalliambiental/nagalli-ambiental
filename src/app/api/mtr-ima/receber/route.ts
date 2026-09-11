import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { MtrImaError } from "@/lib/mtr-ima";
import { receberManifestoPortal as receberManifesto } from "@/lib/mtr-ima-portal";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { conexaoId, numero, responsavel, cargo } = await req.json();
    if (!conexaoId || !numero || !responsavel || !cargo) {
      return NextResponse.json({ error: "conexaoId, numero, responsavel e cargo são obrigatórios" }, { status: 400 });
    }
    const resultado = await receberManifesto(Number(conexaoId), String(numero), String(responsavel), String(cargo));
    await logAuditoria(
      "ATUALIZAR",
      "MtrImaManifesto",
      Number(conexaoId),
      { acao: "receber", numero: String(numero), mensagem: resultado.mensagem },
      session.user?.id ? Number(session.user.id) : undefined
    );
    return NextResponse.json(resultado);
  } catch (e) {
    const status = e instanceof MtrImaError ? e.status : 500;
    const msg = e instanceof MtrImaError ? e.message : "Erro ao receber";
    return NextResponse.json({ error: msg }, { status });
  }
}
