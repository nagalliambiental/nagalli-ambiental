import { NextRequest, NextResponse } from "next/server";
import { consultarLicencaIma } from "@/lib/ima";

export async function GET(req: NextRequest) {
  const licenca = (req.nextUrl.searchParams.get("licenca") || "").trim();
  const protocolo = (req.nextUrl.searchParams.get("protocolo") || "").replace(/\D/g, "");
  const cnpj = (req.nextUrl.searchParams.get("cnpj") || "").replace(/\D/g, "");
  const nome = (req.nextUrl.searchParams.get("nome") || "").trim();

  if (!licenca && !protocolo && !cnpj && !nome) {
    return NextResponse.json(
      { error: "Informe licença, protocolo, CNPJ ou nome" },
      { status: 400 }
    );
  }

  try {
    const resultado = await consultarLicencaIma(
      licenca
        ? { licenca }
        : protocolo
          ? { protocolo }
          : cnpj
            ? { cnpj }
            : { nome }
    );
    if (!resultado || resultado.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma licença encontrada no IMA/SC" },
        { status: 404 }
      );
    }
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json(
      { error: "Falha ao consultar o IMA/SC. Tente novamente." },
      { status: 502 }
    );
  }
}