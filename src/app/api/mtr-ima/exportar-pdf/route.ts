import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";
import { baixarManifestoPdfPortalComSessao, loginPortal } from "@/lib/mtr-ima-portal";
import { unirPdfs } from "@/lib/unir-pdfs";

export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n: number) => Number.isFinite(n)) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Nenhum MTR selecionado" }, { status: 400 });
  if (ids.length > 500) return NextResponse.json({ error: "Máximo de 500 MTRs por PDF" }, { status: 400 });

  try {
    const manifestos = await prisma.mtrImaManifesto.findMany({ where: { id: { in: ids }, status: { not: "CANCELADO" } }, include: { conexao: true } });
    const buffers: Uint8Array[] = [];
    const sessoes = new Map<number, Awaited<ReturnType<typeof loginPortal>>>();
    const falhas: string[] = [];
    for (const m of manifestos) {
      try {
        if (!sessoes.has(m.conexaoId)) sessoes.set(m.conexaoId, await loginPortal(m.conexaoId));
        const pdf = await baixarManifestoPdfPortalComSessao(sessoes.get(m.conexaoId)!, m.conexaoId, m.numero);
        buffers.push(pdf.buffer);
      } catch (e) {
        falhas.push(`${m.numero}: ${e instanceof MtrImaError ? e.message : "erro ao baixar"}`);
      }
    }
    if (!buffers.length) return NextResponse.json({ error: falhas[0] || "Nenhum PDF foi baixado" }, { status: 502 });
    const pdf = await unirPdfs(buffers);
    const response = new NextResponse(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="mtrs-ima-unificado-${new Date().toISOString().slice(0, 10)}.pdf"` } });
    response.headers.set("X-MTR-Falhas", String(falhas.length));
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof MtrImaError ? e.message : "Erro ao unir PDFs" }, { status: 500 });
  }
}
