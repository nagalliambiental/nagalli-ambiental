import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";

function normalizarModelo(body: Record<string, unknown>) {
  const str = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };
  const digits = (v: unknown) => {
    const s = String(v ?? "").replace(/\D/g, "");
    return s ? s : null;
  };
  const num = (v: unknown) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    conexaoId: body?.conexaoId ? Number(body.conexaoId) : null,
    codigoPortal: num(body.codigoPortal),
    nome: String(body.nome || "").trim(),
    descricao: str(body.descricao),
    clienteNome: str(body.clienteNome),
    empreendNome: str(body.empreendNome),
    nomeResponsavel: str(body.nomeResponsavel),
    cargoResponsavel: str(body.cargoResponsavel),
    transportadorCnpj: digits(body.transportadorCnpj),
    transportadorUnidade: num(body.transportadorUnidade),
    transportadorNome: str(body.transportadorNome),
    destinadorCnpj: digits(body.destinadorCnpj),
    destinadorUnidade: num(body.destinadorUnidade),
    destinadorNome: str(body.destinadorNome),
    armazenadorCnpj: digits(body.armazenadorCnpj),
    armazenadorNome: str(body.armazenadorNome),
    nomeMotorista: str(body.nomeMotorista),
    placaVeiculo: str(body.placaVeiculo),
    observacoes: str(body.observacoes),
    residuos: Array.isArray(body.residuos) ? body.residuos : [],
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const conexaoId = searchParams.get("conexaoId");
    const modelos = await prisma.mtrImaModelo.findMany({
      where: conexaoId ? { conexaoId: Number(conexaoId) } : {},
      include: { conexao: { select: { id: true, nome: true, unidade: true } } },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(modelos);
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao listar modelos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    const dados = normalizarModelo(body);
    if (!dados.nome) return NextResponse.json({ error: "Nome do modelo é obrigatório" }, { status: 400 });
    const modelo = await prisma.mtrImaModelo.create({ data: dados });
    return NextResponse.json(modelo, { status: 201 });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao salvar modelo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
