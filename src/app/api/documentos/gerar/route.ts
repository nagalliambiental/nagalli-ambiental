import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { gerarDocumentoBuffer } from "@/lib/documentos-gerados";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { clienteId, templateSlug, formData, dadosEstabelecimento } = body;

  if (!clienteId || !templateSlug || !formData) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  let cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  if (dadosEstabelecimento) {
    cliente = await prisma.cliente.update({
      where: { id: Number(clienteId) },
      data: dadosEstabelecimento,
    });
  }

  const configuracao = await prisma.configuracao.findFirst();

  let buffer: Buffer;
  let filename: string;
  let caminhoRelativo: string;

  try {
    const resultado = gerarDocumentoBuffer(templateSlug, cliente, formData, configuracao);
    buffer = resultado.buffer;
    filename = resultado.filename;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "documentos-gerados");
    await mkdir(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${filename}`;
    caminhoRelativo = `/uploads/documentos-gerados/${safeName}`;
    await writeFile(path.join(uploadDir, safeName), buffer);
  } catch (err) {
    console.error("Erro ao renderizar o documento:", err);
    return NextResponse.json({ error: "Erro ao gerar o documento" }, { status: 500 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentoGerado.create({
      data: { clienteId: Number(clienteId), templateSlug, dadosSnapshot: formData, caminho: caminhoRelativo },
    });

    if (templateSlug === "pgrs-pinhais" || templateSlug === "pgrs-curitiba") {
      await tx.residuoItem.deleteMany({ where: { clienteId: Number(clienteId) } });
      const residuosParaSalvar = [
        ...(formData.residuosPerigosos || []).map((r: any, i: number) => ({ ...r, categoria: "PERIGOSO", ordem: i })),
        ...(formData.residuosNaoReciclaveis || []).map((r: any, i: number) => ({ ...r, categoria: "NAO_RECICLAVEL", ordem: i })),
        ...(formData.residuosReciclaveis || []).map((r: any, i: number) => ({ ...r, categoria: "RECICLAVEL", ordem: i })),
      ];
      if (residuosParaSalvar.length) {
        await tx.residuoItem.createMany({
          data: residuosParaSalvar.map((r: any) => ({ ...r, clienteId: Number(clienteId) })),
        });
      }

      await tx.empresaContratada.deleteMany({ where: { clienteId: Number(clienteId) } });
      if (formData.empresasContratadas?.length) {
        await tx.empresaContratada.createMany({
          data: formData.empresasContratadas.map((e: any, i: number) => ({ ...e, ordem: i, clienteId: Number(clienteId) })),
        });
      }
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
