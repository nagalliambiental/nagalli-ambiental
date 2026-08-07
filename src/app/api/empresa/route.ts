import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerAutenticado, requerPerfil } from "@/lib/perfil";

export async function GET() {
  const { erro } = await requerAutenticado();
  if (erro) return erro;

  const config = await prisma.empresaConfig.findFirst();
  return NextResponse.json(config || {});
}

export async function PUT(request: Request) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  try {
    const body = await request.json();
    const existing = await prisma.empresaConfig.findFirst();

    const config = existing
      ? await prisma.empresaConfig.update({ where: { id: existing.id }, data: body })
      : await prisma.empresaConfig.create({ data: body });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 400 });
  }
}
