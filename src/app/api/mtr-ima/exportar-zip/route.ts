import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { MtrImaError } from "@/lib/mtr-ima";
import { loginPortal, baixarManifestoPdfPortalComSessao } from "@/lib/mtr-ima-portal";
import PizZip from "pizzip";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const corpo = await req.json().catch(() => null);
  const ids = Array.isArray(corpo?.ids) ? corpo.ids.map(Number).filter((n: number) => Number.isFinite(n)) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Nenhum MTR selecionado" }, { status: 400 });
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: "Máximo de 500 MTRs por download em massa" }, { status: 400 });
  }

  try {
    const manifestos = await prisma.mtrImaManifesto.findMany({
      where: { id: { in: ids } },
      include: { conexao: { select: { id: true, nome: true, unidade: true } } },
    });
    if (manifestos.length === 0) {
      return NextResponse.json({ error: "Nenhum MTR encontrado" }, { status: 404 });
    }

    const zip = new PizZip();
    const sessoes = new Map<number, Awaited<ReturnType<typeof loginPortal>>>();
    const falhas: { numero: string; erro: string }[] = [];

    for (const m of manifestos) {
      try {
        if (!sessoes.has(m.conexaoId)) {
          sessoes.set(m.conexaoId, await loginPortal(m.conexaoId));
        }
        const sessao = sessoes.get(m.conexaoId)!;
        const { buffer, filename } = await baixarManifestoPdfPortalComSessao(sessao, m.conexaoId, m.numero);
        const pasta = `MTRs_${(m.conexao.nome || "conexao").replace(/[^\wÀ-ÿ-]+/g, "_")}`;
        zip.file(`${pasta}/${filename}`, buffer);
      } catch (e) {
        falhas.push({ numero: m.numero, erro: e instanceof MtrImaError ? e.message : "Erro ao baixar PDF" });
      }
    }

    if (Object.keys(zip.files).length === 0) {
      const msg = falhas[0]?.erro || "Nenhum PDF foi baixado";
      return NextResponse.json({ error: `Falha ao baixar os PDFs: ${msg}` }, { status: 502 });
    }

    if (falhas.length > 0) {
      const relatorio = falhas.map((f) => `${f.numero}: ${f.erro}`).join("\n");
      zip.file("falhas.txt", relatorio);
    }

    const nodeBuf = zip.generate({ type: "nodebuffer" });
    const zipBytes = new Uint8Array(nodeBuf.length);
    zipBytes.set(nodeBuf);

    const hoje = new Date().toISOString().slice(0, 10);
    await logAuditoria(
      "DOWNLOAD",
      "MtrImaManifesto",
      manifestos[0].conexaoId,
      { acao: "download_massa_zip", total: manifestos.length, baixados: manifestos.length - falhas.length, falhas: falhas.length },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return new NextResponse(zipBytes, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="mtr-ima-${hoje}.zip"`,
      },
    });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao gerar o ZIP";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}