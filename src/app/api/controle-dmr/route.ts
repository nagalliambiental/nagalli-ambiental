import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const registros = await prisma.controleDmr.findMany({
    include: {
      empreendimento: {
        select: { id: true, apelido: true, cliente: { select: { apelido: true } } },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(registros);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { empreendimentoId } = body;

  if (!empreendimentoId) {
    return NextResponse.json({ error: "empreendimentoId é obrigatório" }, { status: 400 });
  }

  const existente = await prisma.controleDmr.findUnique({
    where: { empreendimentoId: Number(empreendimentoId) },
  });

  if (existente) {
    return NextResponse.json({ error: "Empreendimento já cadastrado no controle DMR" }, { status: 409 });
  }

  const ano = new Date().getFullYear();

  const registro = await prisma.controleDmr.create({
    data: {
      empreendimentoId: Number(empreendimentoId),
      ano,
    },
    include: {
      empreendimento: {
        select: { id: true, apelido: true, cliente: { select: { apelido: true } } },
      },
    },
  });

  return NextResponse.json(registro, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ error: "Parâmetro ids é obrigatório (separados por vírgula)" }, { status: 400 });
  }

  const idsArray = ids.split(",").map(Number).filter(Boolean);
  if (idsArray.length === 0) {
    return NextResponse.json({ error: "Nenhum id válido informado" }, { status: 400 });
  }

  await prisma.controleDmr.deleteMany({
    where: { id: { in: idsArray } },
  });

  return NextResponse.json({ removed: idsArray.length });
}
