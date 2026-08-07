import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { readFile, unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documentoGerado.findUnique({ where: { id: Number(id) } });
  if (!doc || !doc.caminho) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", doc.caminho);
    const buffer = await readFile(filePath);
    const filename = path.basename(doc.caminho);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documentoGerado.findUnique({ where: { id: Number(id) } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  if (doc.caminho) {
    try {
      await unlink(path.join(process.cwd(), "public", doc.caminho));
    } catch {
      // arquivo já não existe em disco; segue para remover o registro
    }
  }

  await prisma.documentoGerado.delete({ where: { id: Number(id) } });

  await logAuditoria(
    "delete",
    "documentoGerado",
    Number(id),
    { templateSlug: doc.templateSlug },
    Number((session.user as { id: string }).id)
  );

  return NextResponse.json({ ok: true });
}
