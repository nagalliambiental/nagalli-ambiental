import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { gerarPropostaDemolicao } from "@/lib/templates/proposta-demolicao/generate";
import type { PropostaDemolicaoFormData } from "@/lib/templates/proposta-demolicao/config";
import { formatarMoeda, formatarDataBR } from "@/lib/templates/proposta-demolicao/config";
import type { ModeloPropostaData } from "./modelos";

export function gerarDocxModelo(
  modelo: ModeloPropostaData,
  dados: Record<string, unknown>,
  meta: { numero: number; ano: number; revisao: number },
  templateBytes?: Uint8Array | null
): Buffer {
  if (modelo.codigo === "demolicao") {
    const form: PropostaDemolicaoFormData = {
      engenheiroNome: String(dados.engenheiroNome ?? ""),
      empresaNome: String(dados.empresaNome ?? ""),
      bairro: String(dados.bairro ?? ""),
      cidade: String(dados.cidade ?? ""),
      uf: String(dados.uf ?? ""),
      quantidadePgrcc: Number(dados.quantidadePgrcc) || 0,
      quantidadeRgrcc: Number(dados.quantidadeRgrcc) || 0,
      valorUnitPgrcc: Number(dados.valorUnitPgrcc) || 291.78,
      valorUnitRgrcc: Number(dados.valorUnitRgrcc) || 291.78,
      percentualDesconto: Number(dados.percentualDesconto) || 18,
      valorDesconto:
        dados.valorDesconto != null ? Number(dados.valorDesconto) : undefined,
      totalFinal:
        dados.totalFinal != null && String(dados.totalFinal) !== ""
          ? Number(dados.totalFinal)
          : undefined,
      observacoes: dados.observacoes ? String(dados.observacoes) : undefined,
    };
    return gerarPropostaDemolicao(form, meta);
  }

  if (!templateBytes) {
    throw new Error(`Modelo sem template DOCX: ${modelo.slug}`);
  }

  return renderDocxGenerico(templateBytes, modelo, dados, meta);
}

function renderDocxGenerico(
  templateBytes: Uint8Array,
  modelo: ModeloPropostaData,
  dados: Record<string, unknown>,
  meta: { numero: number; ano: number; revisao: number }
): Buffer {
  const zip = new PizZip(templateBytes);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const renderData: Record<string, unknown> = {
    ...dados,
    numero: meta.numero,
    ano: meta.ano,
    revisao: meta.revisao,
    identificacao: `${meta.numero} / ${meta.ano} – REV. ${String(meta.revisao).padStart(2, "0")}`,
    dataFormatada: formatarDataBR(),
  };

  for (const campo of modelo.campos) {
    if (campo.tipo === "moeda") {
      const v = Number(dados[campo.name]);
      if (!Number.isNaN(v)) {
        renderData[`${campo.name}Formatado`] = formatarMoeda(v);
      }
    }
  }

  doc.render(renderData);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
