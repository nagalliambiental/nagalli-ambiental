import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get("q") || "";
  const clienteId = url.searchParams.get("clienteId");
  const tipo = url.searchParams.get("tipo"); // "geral" | "vinculado"

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { login: { contains: search, mode: "insensitive" } },
      { descricao: { contains: search, mode: "insensitive" } },
    ];
  }
  if (clienteId) where.clienteId = Number(clienteId);
  if (tipo === "geral") where.clienteId = null;
  if (tipo === "vinculado") where.clienteId = { not: null };

  const acessos = await prisma.acesso.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: { cliente: { select: { apelido: true } }, empreendimento: { select: { apelido: true } } },
  });

  return NextResponse.json(acessos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const json = await request.json();
    if (!json.login?.trim() || !json.senha?.trim() || !json.descricao?.trim()) {
      return NextResponse.json({ error: "Login, senha e descrição obrigatórios" }, { status: 400 });
    }

    const acesso = await prisma.acesso.create({
      data: {
        login: json.login.trim(),
        senha: json.senha.trim(),
        descricao: json.descricao.trim(),
        clienteId: json.clienteId ? Number(json.clienteId) : null,
        empreendimentoId: json.empreendimentoId ? Number(json.empreendimentoId) : null,
      },
      include: { cliente: { select: { apelido: true } }, empreendimento: { select: { apelido: true } } },
    });

    return NextResponse.json(acesso, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar acesso" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.acesso.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
