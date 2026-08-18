import { NextResponse } from "next/server";
import { consultarCnpj, type DadosEmpresa } from "@/lib/cnpj";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params;
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  const dado: DadosEmpresa | null = await consultarCnpj(cnpjLimpo).catch(
    () => null
  );

  if (!dado) {
    return NextResponse.json(
      { error: "CNPJ não encontrado nas bases consultadas" },
      { status: 404 }
    );
  }

  return NextResponse.json(dado);
}