import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({
    where: { id: Number(id) },
    include: {
      residuos: { orderBy: { ordem: "asc" } },
      residuosAnuais: { orderBy: { ordem: "asc" } },
      empresasContratadas: { orderBy: { ordem: "asc" } },
      documentosGerados: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }
  return NextResponse.json(empresa);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  delete body.id;
  delete body.residuos;
  delete body.residuosAnuais;
  delete body.empresasContratadas;
  delete body.documentosGerados;
  delete body.criadoEm;
  delete body.updatedAt;

  try {
    const empresa = await prisma.empresa.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(empresa);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar empresa" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.empresa.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao excluir empresa" }, { status: 500 });
  }
}
