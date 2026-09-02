import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baixarManifestoPdf, MtrImaError } from "@/lib/mtr-ima";
import { logAuditoria } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    const manifesto = await prisma.mtrImaManifesto.findUnique({ where: { id: numId } });
    if (!manifesto) return NextResponse.json({ error: "Manifesto não encontrado" }, { status: 404 });

    const { buffer, filename } = await baixarManifestoPdf(manifesto.conexaoId, manifesto.numero);
    await logAuditoria(
      "BAIXAR",
      "MtrImaManifesto",
      manifesto.conexaoId,
      { acao: "download_pdf", numero: manifesto.numero },
      session.user?.id ? Number(session.user.id) : undefined
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao baixar PDF";
    const status = e instanceof MtrImaError ? e.status : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
