import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildDocxData as buildPinhais, renderDocx as renderPinhais } from "@/lib/templates/pgrs-pinhais/generate";
import { buildDocxData as buildCuritiba, renderDocx as renderCuritiba } from "@/lib/templates/pgrs-curitiba/generate";
import { PgrsPinhaisFormData } from "@/lib/templates/pgrs-pinhais/config";
import { PgrsCuritibaFormData } from "@/lib/templates/pgrs-curitiba/config";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { empresaId, templateSlug, formData, dadosEstabelecimento } = body;

  if (!empresaId || !templateSlug || !formData) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  let empresa = await prisma.empresa.findUnique({ where: { id: Number(empresaId) } });
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  if (dadosEstabelecimento) {
    empresa = await prisma.empresa.update({
      where: { id: Number(empresaId) },
      data: dadosEstabelecimento,
    });
  }

  const configuracao = await prisma.configuracao.findFirst();

  let buffer: Buffer;
  let filename: string;

  try {
    if (templateSlug === "pgrs-pinhais") {
      const data = buildPinhais(empresa, formData as PgrsPinhaisFormData, configuracao);
      buffer = renderPinhais(data);
      filename = `PGRS_Pinhais_${empresa.razaoSocial.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
    } else if (templateSlug === "pgrs-curitiba") {
      const data = buildCuritiba(empresa, formData as PgrsCuritibaFormData, configuracao);
      buffer = renderCuritiba(data);
      filename = `PGRS_Curitiba_${empresa.razaoSocial.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
    } else {
      return NextResponse.json({ error: "Modelo de documento desconhecido" }, { status: 400 });
    }
  } catch (err) {
    console.error("Erro ao renderizar o documento:", err);
    return NextResponse.json({ error: "Erro ao gerar o documento" }, { status: 500 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentoGerado.create({
      data: { empresaId: Number(empresaId), templateSlug, dadosSnapshot: formData },
    });

    await tx.residuoItem.deleteMany({ where: { empresaId: Number(empresaId) } });
    const residuosParaSalvar = [
      ...(formData.residuosPerigosos || []).map((r: any, i: number) => ({ ...r, categoria: "PERIGOSO", ordem: i })),
      ...(formData.residuosNaoReciclaveis || []).map((r: any, i: number) => ({ ...r, categoria: "NAO_RECICLAVEL", ordem: i })),
      ...(formData.residuosReciclaveis || []).map((r: any, i: number) => ({ ...r, categoria: "RECICLAVEL", ordem: i })),
    ];
    if (residuosParaSalvar.length) {
      await tx.residuoItem.createMany({
        data: residuosParaSalvar.map((r: any) => ({ ...r, empresaId: Number(empresaId) })),
      });
    }

    await tx.empresaContratada.deleteMany({ where: { empresaId: Number(empresaId) } });
    if (formData.empresasContratadas?.length) {
      await tx.empresaContratada.createMany({
        data: formData.empresasContratadas.map((e: any, i: number) => ({ ...e, ordem: i, empresaId: Number(empresaId) })),
      });
    }
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
