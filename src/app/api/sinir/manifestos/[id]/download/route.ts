import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { baixarManifestoPdf, gerarPdfSimulado, SinirError } from "@/lib/sinir";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const manifesto = await prisma.sinirManifesto.findUnique({
    where: { id: Number(id) },
    include: { conexao: true },
  });
  if (!manifesto) {
    return NextResponse.json({ error: "Manifesto não encontrado" }, { status: 404 });
  }

  const conexao = manifesto.conexao;
  const filename = encodeURIComponent(`MTR-${manifesto.numero}.pdf`).replace(/'/g, "%27");

  try {
    const resultado =
      conexao.modo === "mock"
        ? await gerarPdfSimulado(manifesto)
        : await baixarManifestoPdf(
            {
              id: conexao.id,
              nome: conexao.nome,
              cnpj: conexao.cnpj,
              unidade: conexao.unidade,
              token: conexao.token,
              modo: conexao.modo,
              venceEm: conexao.venceEm,
              ativo: conexao.ativo,
              ultimoUsoEm: conexao.ultimoUsoEm,
            },
            manifesto.numero
          );

    const nomeArquivo = "nomeArquivo" in resultado ? resultado.nomeArquivo : resultado.filename;

    await logAuditoria(
      "DOWNLOAD",
      "SinirManifesto",
      manifesto.id,
      { numero: manifesto.numero, conexao: conexao.nome },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return new NextResponse(resultado.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    if (err instanceof SinirError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao baixar o PDF" }, { status: 500 });
  }
}