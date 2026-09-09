import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const processoId = req.nextUrl.searchParams.get("processoId");

  const exigencias = await prisma.exigencia.findMany({
    where: processoId ? { processoId: Number(processoId) } : undefined,
    include: {
      processo: {
        select: {
          id: true,
          numProtocolo: true,
          numLicenca: true,
          tipo: true,
          orgao: { select: { sigla: true } },
          empreendimento: { select: { apelido: true } },
        },
      },
    },
    orderBy: [{ cumprida: "asc" }, { prazo: "asc" }],
  });

  return NextResponse.json(exigencias);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const exigencia = await prisma.exigencia.create({
      data: {
        descricao: data.descricao,
        prazo: data.prazo ? new Date(data.prazo) : new Date(),
        antecedenciaDias: data.antecedenciaDias !== undefined && data.antecedenciaDias !== "" ? Number(data.antecedenciaDias) : 7,
        cumprida: data.cumprida === true || data.cumprida === "true",
        processoId: Number(data.processoId),
        ativo: data.ativo !== undefined ? Boolean(data.ativo) : true,
      },
    });

    await logAuditoria(
      "criar",
      "exigencia",
      exigencia.id,
      data,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(exigencia, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar exigência:", error);
    return NextResponse.json(
      { error: "Erro ao criar exigência" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.exigencia.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao remover exigências:", e);
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.exigencia.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
