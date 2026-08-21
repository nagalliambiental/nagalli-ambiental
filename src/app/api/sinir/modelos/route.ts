import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = req.nextUrl.searchParams.get("conexaoId");
  const modelos = await prisma.sinirModelo.findMany({
    where: conexaoId ? { conexaoId: Number(conexaoId) } : undefined,
    orderBy: { nome: "asc" },
    include: { conexao: { select: { id: true, nome: true, modo: true } } },
  });

  return NextResponse.json(modelos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    nome, descricao, conexaoId,
    clienteNome, empreendNome, nomeResponsavel,
    transportadorCnpj, transportadorUnidade, transportadorNome, transportadorEndereco, transportadorNumero,
    transportadorUf, transportadorCidade, transportadorCep, transportadorLicenca, transportadorOrgao,
    destinadorCnpj, destinadorUnidade, destinadorNome, destinadorEndereco, destinadorNumero,
    destinadorUf, destinadorCidade, destinadorCep, destinadorLicenca, destinadorOrgao,
    nomeMotorista, placaVeiculo, observacoes, residuos,
  } = body;

  if (!nome) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }

  if (conexaoId) {
    const conexao = await prisma.sinirConexao.findUnique({ where: { id: Number(conexaoId) } });
    if (!conexao) {
      return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
    }
  }

  const modelo = await prisma.sinirModelo.create({
    data: {
      nome: String(nome),
      descricao: descricao ? String(descricao) : null,
      conexaoId: conexaoId ? Number(conexaoId) : null,
      clienteNome: clienteNome ? String(clienteNome) : null,
      empreendNome: empreendNome ? String(empreendNome) : null,
      nomeResponsavel: nomeResponsavel ? String(nomeResponsavel) : null,
      transportadorCnpj: transportadorCnpj ? String(transportadorCnpj) : null,
      transportadorUnidade: transportadorUnidade ? Number(transportadorUnidade) : null,
      transportadorNome: transportadorNome ? String(transportadorNome) : null,
      transportadorEndereco: transportadorEndereco ? String(transportadorEndereco) : null,
      transportadorNumero: transportadorNumero ? String(transportadorNumero) : null,
      transportadorUf: transportadorUf ? String(transportadorUf) : null,
      transportadorCidade: transportadorCidade ? String(transportadorCidade) : null,
      transportadorCep: transportadorCep ? String(transportadorCep) : null,
      transportadorLicenca: transportadorLicenca ? String(transportadorLicenca) : null,
      transportadorOrgao: transportadorOrgao ? String(transportadorOrgao) : null,
      destinadorCnpj: destinadorCnpj ? String(destinadorCnpj) : null,
      destinadorUnidade: destinadorUnidade ? Number(destinadorUnidade) : null,
      destinadorNome: destinadorNome ? String(destinadorNome) : null,
      destinadorEndereco: destinadorEndereco ? String(destinadorEndereco) : null,
      destinadorNumero: destinadorNumero ? String(destinadorNumero) : null,
      destinadorUf: destinadorUf ? String(destinadorUf) : null,
      destinadorCidade: destinadorCidade ? String(destinadorCidade) : null,
      destinadorCep: destinadorCep ? String(destinadorCep) : null,
      destinadorLicenca: destinadorLicenca ? String(destinadorLicenca) : null,
      destinadorOrgao: destinadorOrgao ? String(destinadorOrgao) : null,
      nomeMotorista: nomeMotorista ? String(nomeMotorista) : null,
      placaVeiculo: placaVeiculo ? String(placaVeiculo) : null,
      observacoes: observacoes ? String(observacoes) : null,
      residuos: Array.isArray(residuos) ? residuos : [],
    },
  });

  await logAuditoria(
    "CRIAR",
    "SinirModelo",
    modelo.id,
    { acao: "criar-modelo", nome: modelo.nome, residuos: Array.isArray(residuos) ? residuos.length : 0 },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return NextResponse.json(modelo, { status: 201 });
}