import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


const CAMPOS = ["t1Dmr", "t1Mtr", "t2Dmr", "t2Mtr", "t3Dmr", "t3Mtr", "t4Dmr", "t4Mtr"] as const;
const DATAS = ["t1EnviadaEm", "t2EnviadaEm", "t3EnviadaEm", "t4EnviadaEm"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string | Date | null> = {};
  for (const campo of CAMPOS) {
    if (body[campo] !== undefined) {
      data[campo] = body[campo];
    }
  }
  for (const campo of DATAS) {
    if (body[campo] !== undefined) {
      data[campo] = body[campo] ? new Date(body[campo]) : null;
    }
  }

  const registro = await prisma.controleDmr.update({
    where: { id: Number(id) },
    data,
    include: {
      empreendimento: {
        select: { id: true, apelido: true, cliente: { select: { apelido: true } } },
      },
    },
  });

  return NextResponse.json(registro);
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
  await prisma.controleDmr.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
