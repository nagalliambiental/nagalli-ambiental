import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const usuarioId = Number((session.user as { id: string }).id);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { termosAceitosEm: new Date() },
  });

  await logAuditoria("aceitar", "termos", usuarioId, { termosAceitosEm: true }, usuarioId);

  return NextResponse.json({ ok: true });
}
