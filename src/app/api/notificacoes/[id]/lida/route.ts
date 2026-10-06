import { NextResponse } from "next/server";
import { requerAutenticado } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;
  const { id } = await params;
  await prisma.notificacao.updateMany({ where: { id: Number(id), lida: false }, data: { lida: true } });
  return NextResponse.json({ ok: true });
}
