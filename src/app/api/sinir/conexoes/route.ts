import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criptografar } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexoes = await prisma.sinirConexao.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      unidade: true,
      token: true,
      modo: true,
      venceEm: true,
      ativo: true,
      ultimoUsoEm: true,
      _count: { select: { manifestos: true } },
    },
  });

  return NextResponse.json(
    conexoes.map((c) => ({
      ...c,
      token: c.token ? c.token.replace(/^enc:v1:/, "enc:*").slice(0, 12) + "…" : null,
      temToken: !!c.token,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (perfil !== "socio" && perfil !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, cnpj, unidade, token, modo, venceEm } = body;

  if (!nome || !cnpj || !unidade) {
    return NextResponse.json({ error: "nome, cnpj e unidade são obrigatórios" }, { status: 400 });
  }
  if (modo && modo !== "mock" && modo !== "real") {
    return NextResponse.json({ error: "modo deve ser 'mock' ou 'real'" }, { status: 400 });
  }

  const conexao = await prisma.sinirConexao.create({
    data: {
      nome,
      cnpj: String(cnpj).replace(/\D/g, ""),
      unidade: String(unidade),
      token: token ? criptografar(String(token)) : null,
      modo: modo === "real" ? "real" : "mock",
      venceEm: venceEm ? new Date(venceEm) : null,
    },
  });

  return NextResponse.json({ id: conexao.id, nome: conexao.nome }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (perfil !== "socio" && perfil !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) {
    return NextResponse.json({ error: "Parâmetro ids é obrigatório (separados por vírgula)" }, { status: 400 });
  }

  const idsArray = ids.split(",").map(Number).filter(Boolean);
  if (idsArray.length === 0) {
    return NextResponse.json({ error: "Nenhum id válido informado" }, { status: 400 });
  }

  await prisma.sinirConexao.deleteMany({ where: { id: { in: idsArray } } });
  return NextResponse.json({ removed: idsArray.length });
}