import { formatarMoeda, UF_OPTIONS } from "@/lib/templates/proposta-demolicao/config";

export interface CampoProposta {
  name: string;
  label: string;
  tipo: "texto" | "numero" | "moeda" | "selecao" | "textarea";
  grupo?: string;
  required?: boolean;
  placeholder?: string;
  dica?: string;
  opcoes?: string[];
  defaultValue?: string | number;
}

export interface LinhaResumo {
  label: string;
  valor: string;
  destaque?: boolean;
  negativo?: boolean;
}

export interface ItemInvestimento {
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
  valorLiquido: string;
  incluso?: boolean;
}

export interface ModeloPropostaData {
  slug: string;
  nome: string;
  descricao: string;
  prefixoArquivo: string;
  codigo: string | null;
  campos: CampoProposta[];
}

const numeroDe = (dados: Record<string, unknown>, chave: string, padrao = 0): number => {
  const v = dados[chave];
  return typeof v === "number" ? v : Number(v ?? padrao) || padrao;
};

export const MODELO_DEMOLICAO: ModeloPropostaData = {
  slug: "demolicao",
  nome: "PGRCC e RGRCC (Demolição)",
  descricao:
    "Proposta para obras de demolição com elaboração de PGRCC e RGRCC, cálculo automático por hora técnica (HT SENGE-PR) e controle de revisões.",
  prefixoArquivo: "Proposta_Demolicao",
  codigo: "demolicao",
  campos: [
    {
      name: "engenheiroNome",
      label: "Engenheiro Responsável",
      tipo: "texto",
      grupo: "Dados do Destinatário",
      required: true,
      placeholder: "Ex: Eng. Antonio M. Martins",
    },
    {
      name: "empresaNome",
      label: "Empresa",
      tipo: "texto",
      grupo: "Dados do Destinatário",
      required: true,
      placeholder: "Nome da empresa (não precisa estar cadastrada)",
    },
    {
      name: "bairro",
      label: "Bairro",
      tipo: "texto",
      grupo: "Dados do Destinatário",
      required: true,
      placeholder: "Ex: Prado Velho",
    },
    {
      name: "cidade",
      label: "Cidade",
      tipo: "texto",
      grupo: "Dados do Destinatário",
      required: true,
      defaultValue: "Curitiba",
    },
    {
      name: "uf",
      label: "UF",
      tipo: "selecao",
      grupo: "Dados do Destinatário",
      required: true,
      opcoes: UF_OPTIONS,
      defaultValue: "PR",
    },
    {
      name: "quantidadePgrcc",
      label: "Qtd. PGRCC",
      tipo: "numero",
      grupo: "Itens da Proposta",
      defaultValue: 1,
    },
    {
      name: "quantidadeRgrcc",
      label: "Qtd. RGRCC",
      tipo: "numero",
      grupo: "Itens da Proposta",
      defaultValue: 1,
    },
    {
      name: "valorUnitPgrcc",
      label: "Valor Unitário PGRCC (HT)",
      tipo: "moeda",
      grupo: "Itens da Proposta",
      defaultValue: 291.78,
    },
    {
      name: "valorUnitRgrcc",
      label: "Valor Unitário RGRCC (HT)",
      tipo: "moeda",
      grupo: "Itens da Proposta",
      defaultValue: 291.78,
    },
    {
      name: "percentualDesconto",
      label: "% Desconto",
      tipo: "numero",
      grupo: "Investimento",
      defaultValue: 18,
    },
    {
      name: "totalFinal",
      label: "Valor Final Ajustado (opcional)",
      tipo: "moeda",
      grupo: "Investimento",
      dica: "Deixe em branco para usar o valor com desconto. Ex: se der R$ 1.999, ajuste para R$ 1.900.",
    },
    {
      name: "observacoes",
      label: "Observações",
      tipo: "textarea",
      grupo: "Observações",
    },
  ],
};

function calcularDemolicao(dados: Record<string, unknown>): LinhaResumo[] {
  const valorUnitPgrcc = numeroDe(dados, "valorUnitPgrcc", 291.78);
  const valorUnitRgrcc = numeroDe(dados, "valorUnitRgrcc", 291.78);
  const qtdPgrcc = numeroDe(dados, "quantidadePgrcc");
  const qtdRgrcc = numeroDe(dados, "quantidadeRgrcc");
  const percentual = numeroDe(dados, "percentualDesconto", 18);

  const valorTotalPgrcc = (valorUnitPgrcc * qtdPgrcc) / 0.82;
  const valorTotalRgrcc = (valorUnitRgrcc * qtdRgrcc) / 0.82;
  const totalCalculado = valorTotalPgrcc + valorTotalRgrcc;
  const valorDesconto = totalCalculado * (percentual / 100);
  const totalComDesconto = totalCalculado - valorDesconto;
  const totalFinal =
    dados.totalFinal != null && String(dados.totalFinal) !== ""
      ? numeroDe(dados, "totalFinal")
      : totalComDesconto;

  return [
    {
      label: `Elaboração de PGRCC (${qtdPgrcc} × ${formatarMoeda(valorUnitPgrcc)} / 0,82)`,
      valor: formatarMoeda(valorTotalPgrcc),
    },
    {
      label: `Elaboração de RGRCC (${qtdRgrcc} × ${formatarMoeda(valorUnitRgrcc)} / 0,82)`,
      valor: formatarMoeda(valorTotalRgrcc),
    },
    { label: "Anotação de Responsabilidade Técnica CREA-PR", valor: "incluso" },
    { label: "Total Calculado", valor: formatarMoeda(totalCalculado), destaque: true },
    {
      label: `Desconto (${percentual}%)`,
      valor: `-${formatarMoeda(valorDesconto)}`,
      negativo: true,
    },
    { label: "Total com Desconto", valor: formatarMoeda(totalFinal), destaque: true },
  ];
}

export function calcularModelo(
  modelo: ModeloPropostaData,
  dados: Record<string, unknown>
): LinhaResumo[] {
  if (modelo.codigo === "demolicao") return calcularDemolicao(dados);
  return [];
}

function calcularItensDemolicao(dados: Record<string, unknown>): ItemInvestimento[] {
  const valorUnitPgrcc = numeroDe(dados, "valorUnitPgrcc", 291.78);
  const valorUnitRgrcc = numeroDe(dados, "valorUnitRgrcc", 291.78);
  const qtdPgrcc = numeroDe(dados, "quantidadePgrcc");
  const qtdRgrcc = numeroDe(dados, "quantidadeRgrcc");
  const percentual = numeroDe(dados, "percentualDesconto", 18);
  const fator = 1 - percentual / 100;
  const totalPgrcc = (valorUnitPgrcc * qtdPgrcc) / 0.82;
  const totalRgrcc = (valorUnitRgrcc * qtdRgrcc) / 0.82;

  return [
    {
      descricao: "Elaboração de PGRCC para obra de demolição",
      quantidade: String(qtdPgrcc),
      valorUnitario: formatarMoeda(valorUnitPgrcc),
      valorTotal: formatarMoeda(totalPgrcc),
      valorLiquido: formatarMoeda(totalPgrcc * fator),
    },
    {
      descricao: "Elaboração de RGRCC para obra de demolição",
      quantidade: String(qtdRgrcc),
      valorUnitario: formatarMoeda(valorUnitRgrcc),
      valorTotal: formatarMoeda(totalRgrcc),
      valorLiquido: formatarMoeda(totalRgrcc * fator),
    },
    {
      descricao: "Anotação de Responsabilidade Técnica CREA-PR",
      quantidade: "1",
      valorUnitario: "—",
      valorTotal: "incluso",
      valorLiquido: "incluso",
      incluso: true,
    },
  ];
}

export function calcularItensModelo(
  modelo: ModeloPropostaData,
  dados: Record<string, unknown>
): ItemInvestimento[] {
  if (modelo.codigo === "demolicao") return calcularItensDemolicao(dados);
  return [];
}

export function getModelosEmbutidos(): ModeloPropostaData[] {
  return [MODELO_DEMOLICAO];
}

export function getModeloEmbutido(slug: string): ModeloPropostaData | undefined {
  return MODELO_DEMOLICAO.slug === slug ? MODELO_DEMOLICAO : undefined;
}
