import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { importarLicencaDoOrgao } from "@/lib/consulta-licenca";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);

  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    include: { orgao: true },
  });
  if (!processo) return NextResponse.json({ error: "Licença não encontrada" }, { status: 404 });

  const orgaoSigla = processo.orgao?.sigla?.toUpperCase() || "";
  const isIma = orgaoSigla.includes("IMA");
  const isIat = orgaoSigla.includes("IAT") || orgaoSigla.includes("IAP");

  if (!isIma && !isIat) {
    return NextResponse.json(
      { error: "Consulta automática disponível apenas para IMA (SC) e IAT (PR)" },
      { status: 400 }
    );
  }

  const licenca = processo.numLicenca || "";
  const protocolo = processo.numProtocolo || "";

  if (!licenca && !protocolo) {
    return NextResponse.json(
      { error: "Cadastro não possui número de licença ou protocolo para consultar" },
      { status: 400 }
    );
  }

  try {
    const dados = await importarLicencaDoOrgao({
      licenca: licenca || undefined,
      protocolo: protocolo || undefined,
      orgaoSigla,
    });

    if (!dados) {
      return NextResponse.json(
        { error: "Nenhum registro encontrado no órgão para esta licença" },
        { status: 404 }
      );
    }

    const atualizacoes: Record<string, unknown> = {};
    if (dados.validade) {
      const m = dados.validade.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) {
        const dt = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        if (!isNaN(dt.getTime())) atualizacoes.validade = dt;
      }
    }
    if (dados.licenca && !processo.numLicenca) atualizacoes.numLicenca = dados.licenca;
    if (dados.atividade) atualizacoes.atividade = dados.atividade;
    if (dados.municipio) {
      atualizacoes.municipio = dados.uf && !dados.municipio.includes("/")
        ? `${dados.municipio}/${dados.uf}`
        : dados.municipio;
    }
    if (dados.modalidade && (!processo.tipo || processo.tipo === "Outros")) {
      atualizacoes.tipo = dados.modalidade;
    }

    if (Object.keys(atualizacoes).length > 0) {
      await prisma.processo.update({
        where: { id: processoId },
        data: atualizacoes,
      });
    }

    await logAuditoria("consultar", "Processo", processoId, {
      acao: "verificarStatusOrgao",
      orgao: orgaoSigla,
      resultado: {
        modalidade: dados.modalidade,
        validade: dados.validade,
        orgao: dados.orgaoSigla,
      },
    });

    return NextResponse.json({
      modalidade: dados.modalidade,
      atividade: dados.atividade,
      municipio: dados.municipio,
      uf: dados.uf,
      validade: dados.validade,
      emissao: dados.emissao,
      orgao: dados.orgaoSigla,
      razaoSocial: dados.razaoSocial,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao verificar status:", message);
    return NextResponse.json(
      { error: `Falha ao consultar o órgão: ${message}` },
      { status: 502 }
    );
  }
}
