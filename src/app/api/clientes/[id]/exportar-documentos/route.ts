import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import PizZip from "pizzip";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(id) },
    select: { apelido: true, razaoSocial: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const documentos = await prisma.documento.findMany({
    where: {
      OR: [
        { clienteId: Number(id) },
        { processo: { empreendimento: { clienteId: Number(id) } } },
        { exigencia: { processo: { empreendimento: { clienteId: Number(id) } } } },
      ],
    },
    orderBy: { criadoEm: "asc" },
  });

  const zip = new PizZip();
  const uploadDir = path.join(process.cwd(), "public");

  for (const doc of documentos) {
    try {
      const filePath = path.join(uploadDir, doc.caminho);
      const buffer = await readFile(filePath);
      zip.file(doc.nome, buffer);
    } catch {
      // skip files that can't be read
    }
  }

  const zipBuffer = zip.generate({ type: "nodebuffer" });

  const safeName = cliente.apelido.replace(/\s+/g, "_");
  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}_documentos.zip"`,
    },
  });
}
