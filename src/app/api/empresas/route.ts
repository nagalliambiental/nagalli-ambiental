import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const empresas = await prisma.empresa.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      updatedAt: true,
      _count: { select: { documentosGerados: true } },
    },
  });
  return NextResponse.json(empresas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.razaoSocial || !body.cnpj) {
    return NextResponse.json(
      { error: "razaoSocial e cnpj são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const empresa = await prisma.empresa.create({ data: body });
    return NextResponse.json(empresa, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe uma empresa cadastrada com esse CNPJ" },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 });
  }
}
