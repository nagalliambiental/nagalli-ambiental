import { NextResponse } from "next/server";
export const dynamic = "force-static";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cep: string }> }
) {
  const { cep } = await params;
  const cepLimpo = cep.replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao consultar CEP" }, { status: 502 });
  }

  const data = await res.json();
  if (data.erro) {
    return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    rua: data.logradouro || "",
    bairro: data.bairro || "",
    municipio: data.localidade || "",
    uf: data.uf || "",
    complemento: data.complemento || "",
  });
}
