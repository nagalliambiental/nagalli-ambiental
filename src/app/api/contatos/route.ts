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

  const contatos = await prisma.contato.findMany({
    where: {
      ...(Number.isFinite(empreendimentoId) && empreendimentoId > 0 ? { empreendimentoId } : {}),
    },
    include: {
      empreendimento: { select: { id: true, apelido: true, unidadeSinir: true, cliente: { select: { apelido: true } } } },
    },
    orderBy: [{ empreendimento: { apelido: "asc" } }, { nome: "asc" }],
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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const cargo = typeof body.cargo === "string" && body.cargo.trim() ? body.cargo.trim() : null;
  const telefone = typeof body.telefone === "string" && body.telefone.trim() ? body.telefone.trim() : null;
  const empreendimentoId = Number(body.empreendimentoId);

  if (!nome || !email || !Number.isFinite(empreendimentoId)) {
    return NextResponse.json({ error: "Nome, e-mail e empreendimento são obrigatórios" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const empreendimento = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId } });
  if (!empreendimento) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  const existente = await prisma.contato.findFirst({ where: { email, empreendimentoId } });
  if (existente) {
    return NextResponse.json({ error: "Já existe um contato com este e-mail neste empreendimento" }, { status: 409 });
  }

  const contato = await prisma.contato.create({
    data: { nome, email, cargo, telefone, empreendimentoId },
    include: {
      empreendimento: { select: { id: true, apelido: true, unidadeSinir: true, cliente: { select: { apelido: true } } } },
    },
  });

  await logAuditoria("CRIAR", "Contato", contato.id, { nome, email, empreendimento: empreendimento.apelido },
    session.user?.id ? Number(session.user.id) : undefined);

  return NextResponse.json(contato, { status: 201 });
}
