import { gerarPropostaDemolicao } from "@/lib/templates/proposta-demolicao/generate";
import type { PropostaDemolicaoFormData } from "@/lib/templates/proposta-demolicao/config";

export function gerarDocxModelo(
  modeloSlug: string,
  dados: Record<string, unknown>,
  meta: { numero: number; ano: number; revisao: number }
): Buffer {
  if (modeloSlug === "demolicao") {
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
  throw new Error(`Modelo sem gerador: ${modeloSlug}`);
}
