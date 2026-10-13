import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

const CLASSES = new Set(["A (Solo)", "A", "B", "C", "D"]);

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const classeNome = String(body.classeNome || "");
  if (!id || !CLASSES.has(classeNome)) {
    return NextResponse.json({ error: "MTR ou classe inválida" }, { status: 400 });
  }

  const manifesto = await prisma.sinirManifesto.update({
    where: { id },
    data: { classeNome },
    select: { id: true, numero: true, classeNome: true },
  });

  await logAuditoria(
    "ATUALIZAR",
    "SinirManifesto",
    manifesto.id,
    { classeNome, manual: true },
    session.user?.id ? Number(session.user.id) : undefined,
  );

  return NextResponse.json(manifesto);
}
