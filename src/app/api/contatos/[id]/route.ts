import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const contatoId = Number(id);
  if (!Number.isFinite(contatoId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.nome === "string" && body.nome.trim()) data.nome = body.nome.trim();
  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    data.email = email;
  }
  if (typeof body.cargo === "string") data.cargo = body.cargo.trim() || null;
  if (typeof body.telefone === "string") data.telefone = body.telefone.trim() || null;
  if (body.ativo != null) data.ativo = Boolean(body.ativo);
  if (body.clienteId !== undefined) {
    const clienteId = Number(body.clienteId);
    data.clienteId = Number.isFinite(clienteId) && clienteId > 0 ? clienteId : null;
  }
  if (body.empreendimentoId !== undefined) {
    const empreendimentoId = Number(body.empreendimentoId);
    data.empreendimentoId = Number.isFinite(empreendimentoId) && empreendimentoId > 0 ? empreendimentoId : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const contato = await prisma.contato.update({ where: { id: contatoId }, data });
    await logAuditoria("ATUALIZAR", "Contato", contato.id, data,
      session.user?.id ? Number(session.user.id) : undefined);
    return NextResponse.json(contato);
  } catch {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const contatoId = Number(id);
  if (!Number.isFinite(contatoId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const contato = await prisma.contato.delete({ where: { id: contatoId } });
    await logAuditoria("EXCLUIR", "Contato", contato.id, { nome: contato.nome, email: contato.email },
      session.user?.id ? Number(session.user.id) : undefined);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  }
}
