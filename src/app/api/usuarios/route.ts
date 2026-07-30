import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import bcrypt from "bcryptjs";
export const dynamic = "force-static";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const senha = await bcrypt.hash(data.senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha,
        perfil: data.perfil ?? "tecnico",
        ativo: data.ativo ?? true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    await logAuditoria(
      "criar",
      "usuario",
      usuario.id,
      { nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 400 }
    );
  }
}
