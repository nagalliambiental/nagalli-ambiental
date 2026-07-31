import { NextRequest, NextResponse } from "next/server";
import { consultarSia } from "@/lib/sia";

export async function GET(req: NextRequest) {
  const protocolo = (req.nextUrl.searchParams.get("protocolo") || "").replace(/\D/g, "");
  const licenca = (req.nextUrl.searchParams.get("licenca") || "").replace(/\D/g, "");

  if (!protocolo && !licenca) {
    return NextResponse.json(
      { error: "Informe protocolo ou licença" },
      { status: 400 }
    );
  }

  try {
    const dado = await consultarSia(
      protocolo ? { protocolo } : { licenca }
    );
    if (!dado) {
      return NextResponse.json(
        { error: "Nenhuma licença encontrada no SIA/IAP ou SGA" },
        { status: 404 }
      );
    }
    return NextResponse.json(dado);
  } catch {
    return NextResponse.json(
      { error: "Falha ao consultar o SIA/IAP ou SGA. Tente novamente." },
      { status: 502 }
    );
  }
}
