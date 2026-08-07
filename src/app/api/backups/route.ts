import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const backups = await prisma.backup.findMany({
    orderBy: { criadoEm: "desc" },
    include: { usuario: { select: { nome: true } } },
  });

  return NextResponse.json(backups);
}
