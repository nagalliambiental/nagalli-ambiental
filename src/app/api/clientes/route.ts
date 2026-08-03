import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { ehPrivilegiado } from "@/lib/perfil";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const perfil = (session.user as { perfil?: string }).perfil;
    const where = ehPrivilegiado(perfil) ? {} : { visibilidade: "publico" };

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { criadoEm: "desc" },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao listar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.apelido || !body.razaoSocial || !body.cnpj || !body.telefone || !body.email || !body.respLegal) {
      return NextResponse.json(
        { erro: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }

    const perfil = (session.user as { perfil?: string }).perfil;
    const data = { ...body };
    if (!ehPrivilegiado(perfil)) {
      data.visibilidade = "publico";
    }

    const cliente = await prisma.cliente.create({ data });

    await logAuditoria(
      "CRIAR",
      "Cliente",
      cliente.id,
      data,
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ erro: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.cliente.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ erro: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.cliente.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
