import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const { nome, email, senha } = await request.json();

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (senha.length < 4) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 4 caracteres" },
        { status: 400 }
      );
    }

    const existente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    const totalUsuarios = await prisma.usuario.count();
    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        perfil: totalUsuarios === 0 ? "socio" : "tecnico",
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
      },
    });

    return NextResponse.json(
      {
        message: totalUsuarios === 1
          ? "Conta de administrador criada com sucesso"
          : "Conta criada com sucesso",
        usuario,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 400 }
    );
  }
}
