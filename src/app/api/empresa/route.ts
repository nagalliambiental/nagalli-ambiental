import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await prisma.empresaConfig.findFirst();
  return NextResponse.json(config || {});
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio") {
    return NextResponse.json({ error: "Apenas sócios podem alterar configurações" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const existing = await prisma.empresaConfig.findFirst();

    const config = existing
      ? await prisma.empresaConfig.update({ where: { id: existing.id }, data: body })
      : await prisma.empresaConfig.create({ data: body });

    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 400 });
  }
}