import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const clientes = await prisma.cliente.findMany({
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
    const { apelido, razaoSocial, nomeFantasia, cnpj, rua, numero, bairro, complemento, cep, municipio, uf, telefone, email, respLegal } = body;

    if (!apelido || !razaoSocial || !cnpj || !telefone || !email || !respLegal) {
      return NextResponse.json(
        { erro: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: { apelido, razaoSocial, nomeFantasia, cnpj, rua, numero, bairro, complemento, cep, municipio, uf, telefone, email, respLegal },
    });

    await logAuditoria(
      "CRIAR",
      "Cliente",
      cliente.id,
      { apelido, razaoSocial, nomeFantasia, cnpj, rua, numero, bairro, complemento, cep, municipio, uf, telefone, email, respLegal },
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
