import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

function dataInputParaDate(v: string): Date | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : null;
}

function paraTexto(valor: FormDataEntryValue | null): string | undefined {
  if (typeof valor === "string" && valor.trim()) return valor.trim();
  return undefined;
}

function paraNumero(valor: FormDataEntryValue | null): number | undefined {
  if (typeof valor !== "string" || !/^\d+$/.test(valor.trim())) return undefined;
  return Number(valor.trim());
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const registro = await prisma.autorizacaoTpp.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      numero: true,
      clienteId: true,
      empreendimentoId: true,
      dataEmissao: true,
      dataValidade: true,
      veiculos: true,
      classesRisco: true,
      observacoes: true,
      arquivoNome: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });
  if (!registro) {
    return NextResponse.json({ error: "Autorização não encontrada" }, { status: 404 });
  }
  return NextResponse.json(registro);
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await props.params;
  const atual = await prisma.autorizacaoTpp.findUnique({ where: { id: Number(id) } });
  if (!atual) {
    return NextResponse.json({ error: "Autorização não encontrada" }, { status: 404 });
  }

  try {
    const formData = await request.formData();

    const clienteId = paraNumero(formData.get("clienteId"));
    const dataEmissao = dataInputParaDate(String(formData.get("dataEmissao") || ""));
    const dataValidade = dataInputParaDate(String(formData.get("dataValidade") || ""));
    const numero = paraTexto(formData.get("numero"));

    if (!clienteId) {
      return NextResponse.json({ error: "Selecione um cliente" }, { status: 400 });
    }
    if (!numero) {
      return NextResponse.json({ error: "Informe o nº de registro da autorização" }, { status: 400 });
    }
    if (!dataEmissao || !dataValidade) {
      return NextResponse.json({ error: "Informe a data de emissão e a validade" }, { status: 400 });
    }
    if (dataValidade <= dataEmissao) {
      return NextResponse.json({ error: "A validade deve ser posterior à emissão" }, { status: 400 });
    }

    const arquivo = formData.get("arquivo") as File | null;
    const removerArquivo = formData.get("removerArquivo") === "1";

    const registro = await prisma.autorizacaoTpp.update({
      where: { id: Number(id) },
      data: {
        numero,
        clienteId,
        empreendimentoId: paraNumero(formData.get("empreendimentoId")),
        dataEmissao,
        dataValidade,
        veiculos: paraTexto(formData.get("veiculos")),
        classesRisco: paraTexto(formData.get("classesRisco")),
        observacoes: paraTexto(formData.get("observacoes")),
        arquivo: arquivo ? Buffer.from(await arquivo.arrayBuffer()) : removerArquivo ? null : atual.arquivo,
        arquivoNome: arquivo ? arquivo.name : removerArquivo ? null : atual.arquivoNome,
      },
    });

    await logAuditoria(
      "atualizar",
      "autorizacaoTpp",
      registro.id,
      { numero, clienteId, dataValidade },
      Number((session.user as { id?: number }).id)
    );

    return NextResponse.json({ id: registro.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao atualizar TPP:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await props.params;
  const existente = await prisma.autorizacaoTpp.findUnique({ where: { id: Number(id) } });
  if (!existente) {
    return NextResponse.json({ error: "Autorização não encontrada" }, { status: 404 });
  }

  await prisma.autorizacaoTpp.delete({ where: { id: Number(id) } });
  await logAuditoria(
    "excluir",
    "autorizacaoTpp",
    Number(id),
    { numero: existente.numero, clienteId: existente.clienteId },
    Number((session.user as { id?: number }).id)
  );
  return NextResponse.json({ ok: true });
}