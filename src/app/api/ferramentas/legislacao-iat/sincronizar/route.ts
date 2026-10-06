import { NextResponse } from "next/server";
import { requerAutenticado } from "@/lib/perfil";
import { sincronizarLegislacaoIat } from "@/lib/legislacao-iat-sincronizar";

export const dynamic = "force-dynamic";

export async function POST() {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;
  try {
    const resultado = await sincronizarLegislacaoIat();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao sincronizar." }, { status: 502 });
  }
}
