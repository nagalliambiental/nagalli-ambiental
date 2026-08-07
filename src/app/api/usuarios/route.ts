import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { requerPerfil } from "@/lib/perfil";
import bcrypt from "bcryptjs";

export async function GET() {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

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
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

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
      Number(user.id)
    );

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 400 }
    );
  }
}
