import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const modeloId = Number(id);

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

  const existente = await prisma.sinirModelo.findUnique({ where: { id: modeloId } });
  if (!existente) {
    return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
  }
  if (!nome) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }

  if (conexaoId) {
    const conexao = await prisma.sinirConexao.findUnique({ where: { id: Number(conexaoId) } });
    if (!conexao) {
      return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
    }
  }

  const modelo = await prisma.sinirModelo.update({
    where: { id: modeloId },
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
    "ATUALIZAR",
    "SinirModelo",
    modelo.id,
    { acao: "editar-modelo", nome: modelo.nome },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return NextResponse.json(modelo);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const modeloId = Number(id);

  const existente = await prisma.sinirModelo.findUnique({ where: { id: modeloId } });
  if (!existente) {
    return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
  }

  await prisma.sinirModelo.delete({ where: { id: modeloId } });

  await logAuditoria(
    "EXCLUIR",
    "SinirModelo",
    modeloId,
    { acao: "excluir-modelo", nome: existente.nome },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return NextResponse.json({ ok: true });
}