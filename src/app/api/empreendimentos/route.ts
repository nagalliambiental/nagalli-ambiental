import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { ehPrivilegiado } from "@/lib/perfil";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  const empreendimentos = await prisma.empreendimento.findMany({
    where: ehPrivilegiado(perfil) ? {} : { visibilidade: "publico" },
    include: { cliente: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(empreendimentos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const payload: Record<string, unknown> = { ...data };

    if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) {
      payload.visibilidade = "publico";
    }

    if (payload.clienteId !== undefined && payload.clienteId !== null) {
      const cid = Number(payload.clienteId);
      if (Number.isNaN(cid)) {
        return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
      }
      payload.clienteId = cid;
    }

    for (const key of ["latitude", "longitude"]) {
      if (payload[key] === undefined || payload[key] === null || payload[key] === "") {
        delete payload[key];
      } else {
        const num = Number(payload[key]);
        if (Number.isNaN(num)) {
          return NextResponse.json({ error: `${key} inválido(a)` }, { status: 400 });
        }
        payload[key] = num;
      }
    }

    const empreendimento = await prisma.empreendimento.create({
      data: payload as Prisma.EmpreendimentoUncheckedCreateInput,
    });

    await logAuditoria(
      "criar",
      "empreendimento",
      empreendimento.id,
      payload,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(empreendimento, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao criar empreendimento:", message);
    return NextResponse.json(
      { error: `Erro ao criar empreendimento: ${message}` },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const parsedIds = ids.split(",").map(Number);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.documento.deleteMany({ where: { processo: { empreendimentoId: { in: parsedIds } } } });
      await tx.exigencia.deleteMany({ where: { processo: { empreendimentoId: { in: parsedIds } } } });
      await tx.timelineProcesso.deleteMany({ where: { processo: { empreendimentoId: { in: parsedIds } } } });
      await tx.processo.deleteMany({ where: { empreendimentoId: { in: parsedIds } } });
      await tx.controleDmr.deleteMany({ where: { empreendimentoId: { in: parsedIds } } });
      await tx.empreendimento.deleteMany({ where: { id: { in: parsedIds } } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.empreendimento.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
