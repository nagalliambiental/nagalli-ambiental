import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const propostas = await prisma.proposta.findMany({
    include: {
      cliente: { select: { id: true, apelido: true, razaoSocial: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(propostas);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.titulo || !body.clienteId) {
      return NextResponse.json(
        { error: "Título e cliente são obrigatórios" },
        { status: 400 }
      );
    }

    const proposta = await prisma.proposta.create({
      data: {
        titulo: body.titulo,
        clienteId: Number(body.clienteId),
        empreendimentoId: body.empreendimentoId ? Number(body.empreendimentoId) : null,
        valor: body.valor !== undefined && body.valor !== null ? Number(body.valor) : null,
        status: body.status || "rascunho",
        validadeDias: body.validadeDias !== undefined ? Number(body.validadeDias) : 30,
        servicos: body.servicos ?? undefined,
        observacoes: body.observacoes ?? null,
      },
      include: {
        cliente: { select: { id: true, apelido: true, razaoSocial: true } },
        empreendimento: { select: { id: true, apelido: true } },
      },
    });

    await logAuditoria(
      "criar",
      "proposta",
      proposta.id,
      body,
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(proposta, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao criar proposta:", message);
    return NextResponse.json(
      { error: `Erro ao criar proposta: ${message}` },
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
    await prisma.proposta.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
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
  await prisma.proposta.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
