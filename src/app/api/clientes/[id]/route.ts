import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
    });

    if (!cliente) {
      return NextResponse.json(
        { erro: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { apelido, razaoSocial, cnpj, telefone, email, respLegal } = body;

    if (!apelido || !razaoSocial || !cnpj || !telefone || !email || !respLegal) {
      return NextResponse.json(
        { erro: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data: { apelido, razaoSocial, cnpj, telefone, email, respLegal },
    });

    await logAuditoria(
      "ATUALIZAR",
      "Cliente",
      cliente.id,
      { apelido, razaoSocial, cnpj, telefone, email, respLegal },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
    });

    if (!cliente) {
      return NextResponse.json(
        { erro: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    await prisma.cliente.delete({
      where: { id: Number(id) },
    });

    await logAuditoria(
      "EXCLUIR",
      "Cliente",
      Number(id),
      { apelido: cliente.apelido, razaoSocial: cliente.razaoSocial, cnpj: cliente.cnpj },
      session.user?.id ? Number(session.user.id) : undefined
    );

    return NextResponse.json({ mensagem: "Cliente excluído com sucesso" });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao excluir cliente" },
      { status: 500 }
    );
  }
}
