import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baixarManifestoPdf, SinirError } from "@/lib/sinir";
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
    const manifestos = await prisma.sinirManifesto.findMany({ where: { id: { in: ids }, status: { not: "CANCELADO" } }, include: { conexao: true } });
    const buffers: Uint8Array[] = [];
    const falhas: string[] = [];
    for (const m of manifestos) {
      try {
        const c = m.conexao;
        const pdf = await baixarManifestoPdf({ id: c.id, nome: c.nome, cnpj: c.cnpj, unidade: c.unidade, token: c.token, modo: c.modo, venceEm: c.venceEm, ativo: c.ativo, ultimoUsoEm: c.ultimoUsoEm }, m.numero);
        buffers.push(pdf.buffer);
      } catch (e) {
        falhas.push(`${m.numero}: ${e instanceof SinirError ? e.message : "erro ao baixar"}`);
      }
    }
    if (!buffers.length) return NextResponse.json({ error: falhas[0] || "Nenhum PDF foi baixado" }, { status: 502 });
    const pdf = await unirPdfs(buffers);
    const response = new NextResponse(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="mtrs-sinir-unificado-${new Date().toISOString().slice(0, 10)}.pdf"` } });
    response.headers.set("X-MTR-Falhas", String(falhas.length));
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof SinirError ? e.message : "Erro ao unir PDFs" }, { status: 500 });
  }
}
