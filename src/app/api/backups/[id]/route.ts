import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { readFile } from "fs/promises";
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

  try {
    const filePath = path.join(process.cwd(), "public", backup.arquivo);
    const buffer = await readFile(filePath);
    const filename = path.basename(backup.arquivo);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
