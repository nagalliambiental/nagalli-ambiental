import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      cpf: true,
      conselho: true,
      criadoEm: true,
      _count: { select: { tarefas: true, logs: true } },
    },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  return NextResponse.json(usuario);
}

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfilLogado = (session.user as { perfil?: string }).perfil;
  if (perfilLogado !== "socio") {
    return NextResponse.json({ error: "Apenas sócios podem alterar usuários" }, { status: 403 });
  }

  const { id } = await params;
  const body = await _req.json();

  const data: Record<string, unknown> = {};
  if (body.perfil !== undefined) data.perfil = body.perfil;
  if (body.ativo !== undefined) data.ativo = body.ativo;
  if (body.cpf !== undefined) data.cpf = body.cpf || null;
  if (body.conselho !== undefined) data.conselho = body.conselho || null;
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.email !== undefined) data.email = body.email;

  try {
    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data,
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, cpf: true, conselho: true },
    });

    await logAuditoria("ATUALIZAR", "usuario", usuario.id, data, Number((session.user as { id: string }).id));
    return NextResponse.json(usuario);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 400 });
  }
}
