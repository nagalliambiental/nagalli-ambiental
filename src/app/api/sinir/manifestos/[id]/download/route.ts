import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { baixarCertificadoPdf, baixarManifestoPdf, consultarCertificadoMtr, gerarPdfSimulado, SinirError } from "@/lib/sinir";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const tipo = req.nextUrl.searchParams.get("tipo") === "cdf" ? "cdf" : "mtr";

  const manifesto = await prisma.sinirManifesto.findUnique({
    where: { id: Number(id) },
    include: { conexao: true },
  });
  if (!manifesto) {
    return NextResponse.json({ error: "Manifesto não encontrado" }, { status: 404 });
  }

  const conexao = manifesto.conexao;
  const conexaoCompleta = {
    id: conexao.id,
    nome: conexao.nome,
    cnpj: conexao.cnpj,
    unidade: conexao.unidade,
    token: conexao.token,
    modo: conexao.modo,
    venceEm: conexao.venceEm,
    ativo: conexao.ativo,
    ultimoUsoEm: conexao.ultimoUsoEm,
  };
  const filename = encodeURIComponent(`${tipo === "cdf" ? "CDF" : "MTR"}-${manifesto.numero}.pdf`).replace(/'/g, "%27");

  try {
    let buffer: Uint8Array;
    let nomeArquivo: string;

    if (tipo === "cdf") {
      if (conexao.modo === "mock") {
        return NextResponse.json({ error: "CDF disponível apenas para conexões reais do SINIR" }, { status: 400 });
      }
      const cdfCodigo = await consultarCertificadoMtr(conexaoCompleta, manifesto.numero);
      if (!cdfCodigo) {
        return NextResponse.json(
          { error: `Este MTR (${manifesto.numero}) ainda não possui CDF emitido no SINIR — o destinador precisa confirmar o recebimento e emitir o certificado` },
          { status: 404 }
        );
      }
      const resultado = await baixarCertificadoPdf(conexaoCompleta, cdfCodigo);
      buffer = resultado.buffer;
      nomeArquivo = resultado.filename;
    } else {
      const resultado =
        conexao.modo === "mock"
          ? await gerarPdfSimulado(manifesto)
          : await baixarManifestoPdf(conexaoCompleta, manifesto.numero);
      buffer = resultado.buffer;
      nomeArquivo = "nomeArquivo" in resultado ? resultado.nomeArquivo : resultado.filename;
    }

    await logAuditoria(
      "DOWNLOAD",
      "SinirManifesto",
      manifesto.id,
      { numero: manifesto.numero, tipo, conexao: conexao.nome },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return new NextResponse(buffer as unknown as BodyInit, {
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
    console.error("Falha no download SINIR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? `Falha ao baixar o PDF: ${err.message}` : "Falha ao baixar o PDF" },
      { status: 500 }
    );
  }
}
