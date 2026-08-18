import { NextRequest, NextResponse } from "next/server";
import { consultarLicencaIat } from "@/lib/iat";

export async function GET(req: NextRequest) {
  const licenca = (req.nextUrl.searchParams.get("licenca") || "").replace(/\D/g, "");
  const cnpj = (req.nextUrl.searchParams.get("cnpj") || "").replace(/\D/g, "");
  const nome = (req.nextUrl.searchParams.get("nome") || "").trim();

  if (!licenca && !cnpj && !nome) {
    return NextResponse.json(
      { error: "Informe licença, CNPJ ou nome" },
      { status: 400 }
    );
  }

  try {
    const resultado = await consultarLicencaIat(
      licenca ? { licenca } : cnpj ? { cnpj } : { nome }
    );
    if (!resultado || resultado.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma licença encontrada no SGA/IAT" },
        { status: 404 }
      );
    }
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json(
      { error: "Falha ao consultar o SGA/IAT. Tente novamente." },
      { status: 502 }
    );
  }
}