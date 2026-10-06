import { NextResponse } from "next/server";
import { requerAutenticado } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;
  const usuarioId = Number(authResult.user.id);

  await prisma.notificacao.updateMany({
    where: {
      lida: false,
      OR: [{ destinatarioUsuarioId: usuarioId }, { destinatarioUsuarioId: null }],
    },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
