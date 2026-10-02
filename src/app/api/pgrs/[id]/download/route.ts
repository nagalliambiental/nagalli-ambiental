import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { readFile } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const { id } = await params;
  const pgrs = await prisma.pgrs.findUnique({ where: { id: Number(id) } });
  if (!pgrs) {
    return NextResponse.json({ error: "PGRS não encontrado" }, { status: 404 });
  }

  let buffer: Buffer | null = null;
  if (pgrs.arquivoConteudo) {
    buffer = Buffer.from(pgrs.arquivoConteudo);
  } else if (pgrs.arquivoCaminho) {
    try {
      buffer = await readFile(path.join(process.cwd(), "public", pgrs.arquivoCaminho));
    } catch {
      buffer = null;
    }
  }

  if (!buffer) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const nome = pgrs.arquivoNome || "pgrs.pdf";
  const ext = path.extname(nome).slice(1).toLowerCase();
  const contentType = MIME_BY_EXT[ext] || "application/pdf";
  const filename = encodeURIComponent(nome).replace(/'/g, "%27");

  await logAuditoria(
    "DOWNLOAD",
    "Pgrs",
    pgrs.id,
    { nome },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nome}"; filename*=UTF-8''${filename}`,
    },
  });
}
