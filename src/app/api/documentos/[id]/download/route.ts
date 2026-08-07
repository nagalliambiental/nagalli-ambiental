import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documento.findUnique({ where: { id: Number(id) } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  let buffer: Buffer | null = null;
  if (doc.conteudo) {
    buffer = Buffer.from(doc.conteudo);
  } else {
    try {
      buffer = await readFile(path.join(process.cwd(), "public", doc.caminho));
    } catch {
      buffer = null;
    }
  }

  if (!buffer) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const ext = path.extname(doc.nome).slice(1).toLowerCase();
  const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
  const filename = encodeURIComponent(doc.nome).replace(/'/g, "%27");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${doc.nome}"; filename*=UTF-8''${filename}`,
    },
  });
}
