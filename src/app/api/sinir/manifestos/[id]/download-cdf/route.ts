import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { baixarCdfPdf, SinirError } from "@/lib/sinir";

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
  if (!manifesto || !manifesto.certificado) {
    return NextResponse.json({ error: "Manifesto certificado não encontrado" }, { status: 404 });
  }

  const conexao = manifesto.conexao;
  const filename = encodeURIComponent(`${manifesto.cdfNumero || "CDF"}.pdf`).replace(/'/g, "%27");

  try {
    const resultado = await baixarCdfPdf(
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
      {
        cdfNumero: manifesto.cdfNumero,
        cdfCodigo: manifesto.cdfCodigo,
        clienteNome: manifesto.clienteNome,
        empreendNome: manifesto.empreendNome,
        resumo: manifesto.resumo,
        quantidade: manifesto.quantidade,
        unidade: manifesto.unidade,
        dataRecebimento: manifesto.dataRecebimento,
        numero: manifesto.numero,
      }
    );

    await logAuditoria(
      "DOWNLOAD",
      "SinirCDF",
      manifesto.id,
      { numero: manifesto.numero, cdfNumero: manifesto.cdfNumero, conexao: conexao.nome },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return new NextResponse(resultado.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resultado.filename}"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    if (err instanceof SinirError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao baixar o PDF do CDF" }, { status: 500 });
  }
}