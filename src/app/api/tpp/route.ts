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

export async function GET() {
  const registros = await prisma.autorizacaoTpp.findMany({
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
    orderBy: [{ ativo: "desc" }, { dataValidade: "asc" }],
  });
  return NextResponse.json(registros);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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

    const registro = await prisma.autorizacaoTpp.create({
      data: {
        numero,
        clienteId,
        empreendimentoId: paraNumero(formData.get("empreendimentoId")),
        dataEmissao,
        dataValidade,
        veiculos: paraTexto(formData.get("veiculos")),
        classesRisco: paraTexto(formData.get("classesRisco")),
        observacoes: paraTexto(formData.get("observacoes")),
        arquivo: arquivo ? Buffer.from(await arquivo.arrayBuffer()) : null,
        arquivoNome: arquivo ? arquivo.name : null,
      },
    });

    await logAuditoria(
      "criar",
      "autorizacaoTpp",
      registro.id,
      { numero, clienteId, empreendimentoId: registro.empreendimentoId },
      Number((session.user as { id?: number }).id)
    );

    return NextResponse.json({ id: registro.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao criar TPP:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}