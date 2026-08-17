import { NextRequest, NextResponse } from "next/server";
import { consultarOutorga } from "@/lib/outorga";

export async function GET(req: NextRequest) {
  const protocolo = (req.nextUrl.searchParams.get("protocolo") || "").trim();
  const portaria = (req.nextUrl.searchParams.get("portaria") || "").trim();
  const nome = (req.nextUrl.searchParams.get("nome") || "").trim();
  const cpfCnpj = (req.nextUrl.searchParams.get("cpfCnpj") || "").trim();

  if (!protocolo && !portaria && !nome && !cpfCnpj) {
    return NextResponse.json(
      { error: "Informe protocolo, portaria, nome ou CPF/CNPJ" },
      { status: 400 }
    );
  }

  try {
    const resultado = await consultarOutorga({
      protocolo: protocolo || undefined,
      portaria: portaria || undefined,
      nome: nome || undefined,
      cpfCnpj: cpfCnpj || undefined,
    });
    if (!resultado || resultado.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma outorga encontrada no SIGARH" },
        { status: 404 }
      );
    }
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json(
      { error: "Falha ao consultar o SIGARH. Tente novamente." },
      { status: 502 }
    );
  }
}