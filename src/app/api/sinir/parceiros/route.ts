import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PORTAL_BASE = "https://mtr.sinir.gov.br/api";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const documento = (req.nextUrl.searchParams.get("documento") || "").replace(/\D/g, "");
  if (documento.length < 11 || documento.length > 14) {
    return NextResponse.json({ error: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${PORTAL_BASE}/mtr/consultaListaParceiros/${documento}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json({ error: `Portal SINIR respondeu HTTP ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    if (data?.erro) {
      return NextResponse.json({ error: data.mensagem || "Erro na consulta ao portal SINIR" }, { status: 502 });
    }
    const lista = Array.isArray(data?.objetoResposta) ? data.objetoResposta : [];
    const parceiros = lista
      .filter((p: { parCodigo?: number | null }) => p.parCodigo != null)
      .map((p: { parCodigo: number; parDescricao?: string | null; paeEndereco?: string | null }) => ({
        unidade: Number(p.parCodigo),
        nome: p.parDescricao || "",
        endereco: p.paeEndereco || "",
      }));
    return NextResponse.json(parceiros);
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "Tempo esgotado consultando o portal SINIR" : "Falha de conexão com o portal SINIR";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
