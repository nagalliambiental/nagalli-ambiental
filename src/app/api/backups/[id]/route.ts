import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { logAuditoria } from "@/lib/audit";
import { readFile, unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const { id } = await params;
  const backup = await prisma.backup.findUnique({ where: { id: Number(id) } });
  if (!backup) {
    return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });
  }

  const filename = path.basename(backup.arquivo);

  let buffer: Buffer | null = null;
  if (backup.conteudo) {
    buffer = Buffer.from(backup.conteudo);
  } else {
    try {
      buffer = await readFile(path.join(process.cwd(), "public", backup.arquivo));
    } catch {
      buffer = null;
    }
  }

  if (!buffer) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const { id } = await params;
  const backup = await prisma.backup.findUnique({ where: { id: Number(id) } });
  if (!backup) {
    return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });
  }

  try {
    await unlink(path.join(process.cwd(), "public", backup.arquivo));
  } catch {
    // arquivo não existe em disco (ex.: Vercel) - segue para remover o registro
  }

  await prisma.backup.delete({ where: { id: Number(id) } });

  await logAuditoria(
    "delete",
    "backup",
    Number(id),
    { arquivo: backup.arquivo },
    Number((session.user as { id: string }).id)
  );

  return NextResponse.json({ ok: true });
}
