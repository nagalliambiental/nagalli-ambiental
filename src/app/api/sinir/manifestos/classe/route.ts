import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

const CLASSES = new Set([
  "RCC Classe A (Solo)", "RCC Classe A", "RCC Classe B", "RCC Classe C", "RCC Classe D",
  "Classe I — Perigoso", "Classe II A — Não inerte", "Classe II B — Inerte",
]);

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const classeNome = String(body.classeNome || "");
  if (!id || !CLASSES.has(classeNome)) {
    return NextResponse.json({ error: "MTR ou classe inválida" }, { status: 400 });
  }

  const legado = classeNome.includes("A (Solo)") ? "A (Solo)" : classeNome.includes("Classe A") ? "A" : classeNome.includes("Classe B") || classeNome.includes("II A") ? "B" : classeNome.includes("Classe C") || classeNome.includes("II B") ? "C" : "D";
  const manifesto = await prisma.sinirManifesto.update({
    where: { id },
    data: { classeNome: legado, classificacaoNome: classeNome, classificacaoOrigem: "manual" },
    select: { id: true, numero: true, classeNome: true, classificacaoNome: true },
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
