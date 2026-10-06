import { NextRequest, NextResponse } from "next/server";
import { sincronizarLegislacaoIat } from "@/lib/legislacao-iat-sincronizar";

export const dynamic = "force-dynamic";

/**
 * Cron diário do Vercel (vercel.json): atualiza a base de normas do IAT.
 * Protegido por CRON_SECRET (Vercel envia Authorization: Bearer <secret>).
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const resultado = await sincronizarLegislacaoIat();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao sincronizar." }, { status: 502 });
  }
}
