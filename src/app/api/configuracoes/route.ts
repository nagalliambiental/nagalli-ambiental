import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await prisma.configuracao.findFirst();
  return NextResponse.json(
    config || {
      nomeEmpresa: "",
      cnpj: "",
      registroCrq: "",
      responsavelNome: "",
      responsavelCpf: "",
      responsavelEndereco: "",
      responsavelBairro: "",
      responsavelEmail: "",
      responsavelTelefone: "",
    }
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  delete body.id;
  delete body.atualizadoEm;

  try {
    const existing = await prisma.configuracao.findFirst();
    let config;
    if (existing) {
      config = await prisma.configuracao.update({ where: { id: existing.id }, data: body });
    } else {
      config = await prisma.configuracao.create({ data: body });
    }
    return NextResponse.json(config);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}
