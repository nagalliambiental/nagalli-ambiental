import { NextRequest, NextResponse } from "next/server";
import { gerarAlertasDeVencimento } from "@/lib/prazos-alertas";
import { backupSeVencido } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron diário do Vercel (vercel.json):
 *  1. Cria notificações no sino para vencimentos de licenças, PGRS, TPP e exigências;
 *  2. Gera o backup automático quando vencido (INTERVALO_BACKUP_DIAS).
 * Protegido por CRON_SECRET (Vercel envia Authorization: Bearer <secret>).
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const alertas = await gerarAlertasDeVencimento();

    let backupGerado = false;
    try {
      backupGerado = await backupSeVencido();
    } catch (e) {
      console.error("[cron/diario] erro no backup:", e);
    }

    console.log(`[cron/diario] alertas: ${alertas.criados} novos de ${alertas.verificados} verificados; backup: ${backupGerado ? "gerado" : "no prazo"}`);
    return NextResponse.json({ ok: true, alertas, backupGerado });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha no cron diário." }, { status: 502 });
  }
}
