import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const empreendimentoId = Number(req.nextUrl.searchParams.get("empreendimentoId"));
  const clienteIdRaw = req.nextUrl.searchParams.get("clienteId");
  const clienteId = Number(clienteIdRaw);

  const contatos = await prisma.contato.findMany({
    where: {
      ...(Number.isFinite(empreendimentoId) && empreendimentoId > 0 ? { empreendimentoId } : {}),
      ...(Number.isFinite(clienteId) && clienteId > 0 ? { clienteId } : {}),
    },
    include: {
      empreendimento: { select: { id: true, apelido: true, unidadeSinir: true, cliente: { select: { apelido: true } } } },
      cliente: { select: { id: true, apelido: true } },
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(contatos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const assunto = typeof body.assunto === "string" && body.assunto.trim() ? body.assunto.trim() : null;
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const cargo = typeof body.cargo === "string" && body.cargo.trim() ? body.cargo.trim() : null;
  const telefone = typeof body.telefone === "string" && body.telefone.trim() ? body.telefone.trim() : null;
  const empreendimentoId = Number(body.empreendimentoId);
  const clienteId = Number(body.clienteId);

  if (!nome) {
    return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail invalido" }, { status: 400 });
  }

  const temEmpreendimento = Number.isFinite(empreendimentoId) && empreendimentoId > 0;
  const temCliente = Number.isFinite(clienteId) && clienteId > 0;

  if (temEmpreendimento) {
    const empreendimento = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId } });
    if (!empreendimento) {
      return NextResponse.json({ error: "Empreendimento nao encontrado" }, { status: 404 });
    }
  }
  if (temCliente) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
    }
  }

  const contato = await prisma.contato.create({
    data: {
      nome,
      assunto,
      email,
      cargo,
      telefone,
      empreendimentoId: temEmpreendimento ? empreendimentoId : null,
      ...(temCliente ? { clienteId } : {}),
    },
    include: {
      empreendimento: { select: { id: true, apelido: true, unidadeSinir: true, cliente: { select: { apelido: true } } } },
      cliente: { select: { id: true, apelido: true } },
    },
  });

  await logAuditoria("CRIAR", "Contato", contato.id, { nome, email, assunto, empreendimentoId: contato.empreendimentoId, clienteId: contato.clienteId },
    session.user?.id ? Number(session.user.id) : undefined);

  return NextResponse.json(contato, { status: 201 });
}
