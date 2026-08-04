export interface PropostaDemolicaoFormData {
  engenheiroNome: string;
  empresaNome: string;
  bairro: string;
  cidade: string;
  uf: string;
  quantidadePgrcc: number;
  quantidadeRgrcc: number;
  valorUnitPgrcc: number;
  valorUnitRgrcc: number;
  percentualDesconto: number;
  valorDesconto?: number;
  totalFinal?: number;
  observacoes?: string;
}

export interface PropostaDemolicaoDocxData {
  numero: number;
  ano: number;
  revisao: number;
  identificacao: string;
  dataFormatada: string;
  cidade: string;
  engenheiroNome: string;
  empresaNome: string;
  bairro: string;
  uf: string;
  quantidadePgrcc: number;
  quantidadePgrccExtenso: string;
  quantidadeRgrcc: number;
  quantidadeRgrccExtenso: string;
  valorUnitPgrcc: number;
  valorUnitRgrcc: number;
  valorUnitPgrccFormatado: string;
  valorUnitRgrccFormatado: string;
  valorTotalPgrcc: number;
  valorTotalRgrcc: number;
  valorTotalPgrccFormatado: string;
  valorTotalRgrccFormatado: string;
  percentualDesconto: number;
  valorDesconto: number;
  valorDescontoFormatado: string;
  totalCalculado: number;
  totalCalculadoFormatado: string;
  totalFinal: number;
  totalFinalFormatado: string;
  observacoes?: string;
  htNote: string;
}

export const VALOR_HT_PADRAO = 291.78;

export const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export const NUMEROS_EXTENSO: Record<number, string> = {
  0: "zero",
  1: "um",
  2: "dois",
  3: "três",
  4: "quatro",
  5: "cinco",
  6: "seis",
  7: "sete",
  8: "oito",
  9: "nove",
  10: "dez",
  11: "onze",
  12: "doze",
  13: "treze",
  14: "quatorze",
  15: "quinze",
  16: "dezesseis",
  17: "dezessete",
  18: "dezoito",
  19: "dezenove",
  20: "vinte",
  30: "trinta",
  40: "quarenta",
  50: "cinquenta",
  60: "sessenta",
  70: "setenta",
  80: "oitenta",
  90: "noventa",
  100: "cem",
};

export function numeroParaExtenso(n: number): string {
  if (n in NUMEROS_EXTENSO) return NUMEROS_EXTENSO[n];
  if (n < 100) {
    const dezena = Math.floor(n / 10) * 10;
    const unidade = n % 10;
    return `${NUMEROS_EXTENSO[dezena]} e ${NUMEROS_EXTENSO[unidade]}`;
  }
  if (n < 1000) {
    const centena = Math.floor(n / 100);
    const resto = n % 100;
    const centenaTexto = centena === 1 ? "cento" : `${NUMEROS_EXTENSO[centena]}centos`;
    return resto > 0 ? `${centenaTexto} e ${numeroParaExtenso(resto)}` : centenaTexto;
  }
  return String(n);
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarDataBR(data: Date = new Date()): string {
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
}

export function buildDocxData(form: PropostaDemolicaoFormData, meta: { numero: number; ano: number; revisao: number }): PropostaDemolicaoDocxData {
  const valorUnitPgrcc = form.valorUnitPgrcc || VALOR_HT_PADRAO;
  const valorUnitRgrcc = form.valorUnitRgrcc || VALOR_HT_PADRAO;
  const qtdPgrcc = form.quantidadePgrcc || 0;
  const qtdRgrcc = form.quantidadeRgrcc || 0;
  const percentualDesconto = form.percentualDesconto || 0;

  const valorTotalPgrcc = (valorUnitPgrcc * qtdPgrcc) / 0.82;
  const valorTotalRgrcc = (valorUnitRgrcc * qtdRgrcc) / 0.82;
  const totalCalculado = valorTotalPgrcc + valorTotalRgrcc;
  const valorDesconto = totalCalculado * (percentualDesconto / 100);
  const totalFinal = form.totalFinal ?? (totalCalculado - valorDesconto);

  return {
    numero: meta.numero,
    ano: meta.ano,
    revisao: meta.revisao,
    identificacao: `${meta.numero} / ${meta.ano} – REV. ${String(meta.revisao).padStart(2, "0")}`,
    dataFormatada: formatarDataBR(),
    cidade: form.cidade,
    engenheiroNome: form.engenheiroNome,
    empresaNome: form.empresaNome,
    bairro: form.bairro,
    uf: form.uf,
    quantidadePgrcc: qtdPgrcc,
    quantidadePgrccExtenso: numeroParaExtenso(qtdPgrcc),
    quantidadeRgrcc: qtdRgrcc,
    quantidadeRgrccExtenso: numeroParaExtenso(qtdRgrcc),
    valorUnitPgrcc,
    valorUnitRgrcc,
    valorUnitPgrccFormatado: formatarMoeda(valorUnitPgrcc),
    valorUnitRgrccFormatado: formatarMoeda(valorUnitRgrcc),
    valorTotalPgrcc,
    valorTotalRgrcc,
    valorTotalPgrccFormatado: formatarMoeda(valorTotalPgrcc),
    valorTotalRgrccFormatado: formatarMoeda(valorTotalRgrcc),
    percentualDesconto,
    valorDesconto,
    valorDescontoFormatado: formatarMoeda(valorDesconto),
    totalCalculado,
    totalCalculadoFormatado: formatarMoeda(totalCalculado),
    totalFinal,
    totalFinalFormatado: formatarMoeda(totalFinal),
    observacoes: form.observacoes,
    htNote: `* 1 HT = ${formatarMoeda(VALOR_HT_PADRAO)} (valor correspondente a 3% de 6 salários mínimos = SENGE-PR)`,
  };
}