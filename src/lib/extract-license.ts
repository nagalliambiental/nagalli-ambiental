import pdfParse from "pdf-parse/lib/pdf-parse.js";

const OCR_API = "https://api.ocr.space/parse/image";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
};

const INICIOS_SECAO: RegExp[] = [
  /^\s*\d{1,2}(?:\.\d+)*[.)\-]?\s*-?\s*CONDICIONANTES\b[^\n]*$/im,
  /^\s*CONDICIONANTES\s+AMBIENTAIS?\b[^\n]*$/im,
  /^\s*CONDICIONANTES\b[^\n]*$/im,
  /CONDICIONANTES\s+D[AE]\s+(?:LICEN[ÇC]A|AUTORIZA[ÇC][ÃA]|OUTORGA)[^\n]*/i,
  /^\s*\d{1,2}[.)\-]?\s*-?\s*CONDI[ÇC][ÕO]ES\s+(?:E\s+RESTRI[ÇC][ÕO]ES\s+)?(?:ESPEC[ÍI]FICAS|PARTICULARES)\b[^\n]*$/im,
  /^\s*CONDI[ÇC][ÕO]ES\s+ESPEC[ÍI]FICAS\b[^\n]*$/im,
  /^\s*CONDI[ÇC][ÕO]ES\s+GERAIS\b[^\n]*$/im,
  /^\s*\d{1,2}[.)\-]?\s*-?\s*CONDI[ÇC][ÕO]ES\b[^\n]*$/im,
  /^\s*Condi[çc][õo]es\s*$/im,
];

const FINS_SECAO: RegExp[] = [
  /^\s*\d{1,2}\s*[.)]\s*[A-ZÀ-Ü][^\n]{2,70}$/m,
  /^\s*(?:DADOS\s+(?:DO|DA)\s+\w|DADOS\s+COMPLEMENTARES|DADOS\s+DO\s+TITULAR|DADOS\s+DO\s+PROPONENTE|DADOS\s+DO\s+REQUERENTE|DADOS\s+CONTRATANTE|DADOS\s+DO\s+CONTRATADO)\b[^\n]*$/im,
  /^(?:ANEXOS?|ANEXO\s+[A-Z0-9]|OBSERVA[ÇC][ÕO]ES|ASSINATURAS?|RESPONS[ÁA]VEIS?|LOCAL\s+E\s+DATA|C[ÓO]DIGO\s+DE\s+BARRAS|[A-ZÀ-Ü]{4,})\s*$/m,
  /(?:^|\n)\s*P[aá]gina\s+\d+/i,
  /(?:^|\n)\s*Assinatura do Representante/i,
  /(?:^|\n)\s*Esta LICEN[ÇC]A/i,
  /(?:^|\n)\s*Esta AUTORIZA[ÇC][ÃA]O/i,
  /(?:^|\n)\s*Esta OUTORGA/i,
];

const CABECALHO_MAISCULAS = /^[A-ZÀ-Ü][A-ZÀ-Ü\s.\-/&(),º°]{3,60}$/;

export interface CamposLicenca {
  validade: string | null;
  numLicenca: string | null;
  numProtocolo: string | null;
  dataProtocolo: string | null;
  condicionantes: string | null;
  dadosEmpreendimento: string | null;
}

export async function runOcr(buffer: Buffer, ext: string): Promise<string> {
  const mime = MIME_TYPES[ext] || "application/pdf";
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mime};base64,${base64}`;
  const apiKey = process.env.OCR_API_KEY || "helloworld";

  const formData = new FormData();
  formData.append("base64Image", dataUri);
  formData.append("apikey", apiKey);
  formData.append("language", "por");
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const res = await fetch(OCR_API, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`OCR API failed: ${res.status}`);
  const json = await res.json();
  if (json.IsErroredOnProcessing) {
    throw new Error(json.ErrorMessage?.[0] || "OCR processing error");
  }
  return json.ParsedResults?.map((r: { ParsedText?: string }) => r.ParsedText || "").join("\n") || "";
}

export async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  try {
    const parsed = await pdfParse(buffer);
    return parsed?.text || "";
  } catch {
    return "";
  }
}

export function limparTextoPdf(texto: string): string {
  let t = texto;
  t = t.replace(/^\s*(?:P[aá]gina\s+)?\d{1,4}\s*\/\s*\d{1,4}\s*$/gm, "");
  t = t.replace(/^\s*(?:P[aá]gina\s+)\d{1,4}(?:\s*de\s*\d{1,4})?\s*$/gim, "");
  t = t.replace(/^\s*P[aá]gina\s+\d+\/[^\n]*$/gim, "");
  t = t.replace(/^\s*\d{1,4}\s*\/\s*\d{1,4}\s*$/gm, "");
  t = t.replace(/^\s*\d{1,4}\s*$/gm, "");
  t = t.replace(/\s*EM\s+BRANCO\s*/gi, " ");
  t = t.replace(/\s*-\n\s*/g, "");
  t = t.replace(/([a-záàâãéêíóôõúç])\n([a-záàâãéêíóôõúç])/gi, "$1 $2");
  t = t.replace(/([.,;:!?)])\n([A-ZÀ-Ü])/g, "$1 $2");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

export async function extrairTextoComOcr(buffer: Buffer, ext: string): Promise<string> {
  if (ext === "pdf") {
    const textoLocal = await extrairTextoPdf(buffer);
    if (textoLocal.replace(/\s+/g, "").length >= 30) return limparTextoPdf(textoLocal);
    try {
      const ocr = await runOcr(buffer, ext);
      return limparTextoPdf(ocr);
    } catch {
      return limparTextoPdf(textoLocal);
    }
  }
  try {
    const ocr = await runOcr(buffer, ext);
    return limparTextoPdf(ocr);
  } catch {
    return "";
  }
}

function removerLinhasRepetidas(secao: string): string {
  const contagem = new Map<string, number>();
  const linhas = secao.split("\n");
  for (const linha of linhas) {
    const chave = linha.trim();
    if (!chave || chave.length > 80) continue;
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  }
  const vistos = new Set<string>();
  return linhas.filter((linha) => {
    const chave = linha.trim();
    if (!chave) return true;
    if ((contagem.get(chave) || 0) > 1 && !vistos.has(chave)) {
      vistos.add(chave);
      return true;
    }
    return (contagem.get(chave) || 0) <= 1;
  }).join("\n");
}

export function extrairSecaoCondicionantes(texto: string): string | null {
  if (!texto) return null;

  let inicio = -1;
  for (const re of INICIOS_SECAO) {
    const m = texto.match(re);
    if (m && m.index !== undefined) {
      inicio = m.index + m[0].length;
      break;
    }
  }
  if (inicio === -1) {
    const m = texto.match(/CONDICIONANTES/i);
    if (m && m.index !== undefined) inicio = m.index + m[0].length;
  }
  if (inicio === -1) return null;

  let fim = texto.length;
  for (const re of FINS_SECAO) {
    const m = texto.slice(inicio + 10).match(re);
    if (m && m.index !== undefined) {
      const pos = inicio + 10 + m.index;
      if (pos > inicio && pos < fim) fim = pos;
    }
  }

  let secao = texto.slice(inicio, fim);

  secao = secao.replace(/^\s*(?:P[aá]gina\s+\d+(?:\/\d+)?|\d{1,4})\s*$/gm, "");
  secao = secao.replace(/https?:\/\/\S+/gi, "");
  secao = removerLinhasRepetidas(secao);
  secao = secao.replace(/[ \t]*-\n[ \t]*/g, "");
  secao = secao.replace(/[ \t]+/g, " ");
  secao = secao
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l)
    .filter((l) => !/^\s*EM\s+BRANCO\s*$/i.test(l))
    .filter((l) => !/^\s*\d{2}\/\d{2}\/\d{4}\s*$/i.test(l))
    .filter((l) => !/^\s*\d{2,}\.\d{3}\.\d{3}[\-\d\/]*\s*$/i.test(l))
    .filter((l) => !/^\s*Condi[çc][õo]es\s*$/i.test(l))
    .filter((l) => {
      if (!(CABECALHO_MAISCULAS.test(l) && l.length <= 40)) return true;
      return false;
    })
    .join("\n");
  secao = secao.replace(/\n{3,}/g, "\n\n").trim();

  const CORTE_POR_SECAO = /(?:^|\n)\s*(?:DADOS\s+(?:DO|DA|DOS|DAS)\s+\w|DADOS\s+COMPLEMENTARES|DADOS\s+DO\s+TITULAR|DADOS\s+DO\s+PROPONENTE|DADOS\s+DO\s+REQUERENTE|DADOS\s+CONTRATANTE|DADOS\s+DO\s+CONTRATADO|ENDERE[ÇC]O\s+(?:DO|DA)\s+\w|LOCALIZA[ÇC][ÃA]O|ATIVIDADES?\s+PROPOSTAS?|CAPACIDADE\s+INSTALADA|PARTICIPA[ÇC][ÃA]O\s+ACION[ÁA]RIA|OBJETO\s+SOCIAL|RAMO\s+DE\s+ATIVIDADE|FONTES?\s+DE\s+RECURSOS?|METAS?\s+E\s+INDICADORES?|VALIDADE\s+DA\s+LICEN[ÇC]A|VALIDADE\s+DO\s+REGISTRO|NORMAS?\s+APLIC[ÁA]VEIS|MEDIDAS?\s+MITIGADORAS?|PROGRAMAS?\s+DE\s+MONITORAMENTO|PLANO\s+DE\s+(?:EMERG[ÊE]NCIA|MANEJO|CONTROLE)|RESPONS[ÁA]VEL\s+T[ÉE]CNICO|REPRESSANTES?\s+AO\s+CUMPRIMENTO)\b/i;
  const corteMatch = secao.match(CORTE_POR_SECAO);
  if (corteMatch && corteMatch.index !== undefined && corteMatch.index > 20) {
    secao = secao.slice(0, corteMatch.index).trim();
  }

  return secao.length >= 20 ? secao : null;
}

export function extrairDadosEmpreendimento(texto: string): string | null {
  if (!texto) return null;

  const padroesInicio = [
    /[-–]?\s*DADOS\s+DO\s+EMPREENDIMENTO[:\s]*/i,
    /CARACTERIZA[ÇC][ÃA]O\s+DO\s+EMPREENDIMENTO[:\s]*/i,
    /CARACTERIZA[ÇC][ÃA]O\s+D[OA]\s+EMPREENDIMENTO[:\s]*/i,
    /DADOS\s+DA\s+ATIVIDADE[:\s]*/i,
  ];

  let inicio = -1;
  let fim = -1;

  for (const re of padroesInicio) {
    const m = texto.match(re);
    if (m && m.index !== undefined) {
      inicio = m.index;
      fim = m.index + m[0].length;
      break;
    }
  }
  if (inicio === -1) return null;

  const blocoDados = texto.slice(fim);
  const linhas = blocoDados.split("\n");

  const RE_TRANSICAO = /(?:diz\s+respeito\s+somente|descri[çc][õo]es?\s+acima|itens?\s+abaixo|devendo\s+a\s+favorecida|d[ée]cima\s+acima)/i;
  const RE_ITEM_NUM = /^\s*\d+\.\s+[A-ZÀ-Ü]/;
  let primeiroItemNum = -1;

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (!l) continue;

    if (RE_TRANSICAO.test(l)) {
      fim += linhas.slice(0, i + 1).join("\n").length;
      primeiroItemNum = -2;
      break;
    }

    if (RE_ITEM_NUM.test(l) && primeiroItemNum === -1) {
      primeiroItemNum = linhas.slice(0, i).join("\n").length;
    }
  }

  if (primeiroItemNum === -2) {
    // Already set by transition match
  } else if (primeiroItemNum >= 0) {
    fim += primeiroItemNum;
  } else {
    fim = Math.min(fim + 2000, texto.length);
  }

  let secao = texto.slice(inicio, fim);
  secao = secao.replace(/^\s*(?:P[aá]gina\s+\d+(?:\/\d+)?|\d{1,4})\s*$/gm, "");
  secao = secao.replace(/[ \t]+/g, " ");
  secao = secao
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l)
    .filter((l) => !(CABECALHO_MAISCULAS.test(l) && l.length <= 40))
    .join("\n");
  secao = secao.replace(/\n{3,}/g, "\n\n").trim();
  secao = secao.replace(/\d+\s*[-–]?\s*$/m, "").trim();
  secao = secao.replace(/\d+\s*[-–]\s*CONDICIONANTES\s*$/i, "").trim();

  return secao.length >= 10 ? secao : null;
}

const PADROES_DATA = [
  /validade[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /v[aá]lido at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /data\s+de\s+validade[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /v[aá]lida at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /prazo[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /(\d{2})\/(\d{2})\/(\d{4})/,
];

const PADROES_DATA_EMISSAO = [
  /data\s+de\s+(?:emiss[aã]o|protocolo|publica[çc][ãa]o)[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /protocol(?:o|ado)\s+em[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /emitido\s+em[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
];

const PADROES_LICENCA = [
  /n[úu]mero\s+do\s+documento[^\d\n]*[\n\r\s]*(\d{3,})/i,
  /LICEN[ÇC]A\s+PR[ÉE]VIA[\n\r\s]+(\d{3,})/i,
  /licen[cç]a\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:da\s+)?licen[cç]a[:\s]*([\d\/\.\-]+)/i,
  /autoriza[çc][ãa]o\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /outorga\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /portaria[:\s]*(\d+\/\d+)/i,
  /licen[cç]a\s*(?:ambiental)?\s*:?\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*\.?\s*([A-Z0-9][\d\/\.\-]{2,})/i,
];

const PADROES_PROTOCOLO = [
  /n[úu]mero\s+do\s+protocolo[^\d]*?([\d][\d\.\/\-]{4,})/i,
  /protocolo\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:do\s+)?protocolo[:\s]*([\d\/\.\-]+)/i,
  /processo\s+(?:administrativo\s+)?n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /processo[:\s]*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*\.?\s*([\d\/\.\-]{3,})\s*\/\s*\d{4}/i,
];

export function extractFields(text: string): CamposLicenca {
  let validade: string | null = null;
  for (const pat of PADROES_DATA) {
    const m = text.match(pat);
    if (m) {
      const [, d, mo, y] = m;
      const dia = parseInt(d, 10);
      const mes = parseInt(mo, 10);
      const ano = parseInt(y, 10);
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
        validade = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
        break;
      }
    }
  }

  let dataProtocolo: string | null = null;
  for (const pat of PADROES_DATA_EMISSAO) {
    const m = text.match(pat);
    if (m) {
      const [, d, mo, y] = m;
      const dia = parseInt(d, 10);
      const mes = parseInt(mo, 10);
      const ano = parseInt(y, 10);
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
        dataProtocolo = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
        break;
      }
    }
  }

  let numLicenca: string | null = null;
  for (const pat of PADROES_LICENCA) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      const raw = m[1].trim();
      if (!/^\d+$/.test(raw.replace(/[\/\-\.]/g, ""))) continue;
      numLicenca = raw;
      break;
    }
  }

  let numProtocolo: string | null = null;
  for (const pat of PADROES_PROTOCOLO) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      const raw = m[1].trim();
      if (raw === numLicenca) continue;
      numProtocolo = raw;
      break;
    }
  }

  return {
    validade,
    numLicenca,
    numProtocolo,
    dataProtocolo,
    condicionantes: extrairSecaoCondicionantes(text),
    dadosEmpreendimento: extrairDadosEmpreendimento(text),
  };
}

const INICIO_ITEM = /^(?:\d+(?:\.\d+)*[.)\-]|\d+\.\d+|[-•*]\s|[a-z]\))/i;
const PREFIXO_ITEM = /^(?:\d+(?:\.\d+)*[.)\-]|[-•*]\s|[a-z]\))\s*/i;

export interface ItemExtraido {
  titulo: string;
  descricao: string;
}

const PALAVRAS_CONTINUACAO = /^(?:e\/ou|bem como|inclu(?:indo|íveis?|a)|sendo|do|da|dos|das|com|em|no|na|nos|nas)\b/i;

function ehContinuacao(anterior: string, proximo: string): boolean {
  const a = anterior.trimEnd();
  const p = proximo.trimStart();

  if (a.endsWith(":") || a.endsWith(",") || a.endsWith(";")) return true;
  if (/^[a-záàâãéêíóôõúç]/.test(p)) return true;
  if (PALAVRAS_CONTINUACAO.test(p)) return true;
  return false;
}

export function dividirTextoEmItens(texto: string): ItemExtraido[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const bruto: string[] = [];
  let atual: string[] = [];

  for (const linha of linhas) {
    if (INICIO_ITEM.test(linha)) {
      if (atual.length) bruto.push(atual.join(" "));
      atual = [linha.replace(PREFIXO_ITEM, "")];
    } else {
      atual.push(linha);
    }
  }
  if (atual.length) bruto.push(atual.join(" "));

  const mesclados: string[] = [];
  for (const item of bruto) {
    if (mesclados.length > 0 && ehContinuacao(mesclados[mesclados.length - 1], item)) {
      mesclados[mesclados.length - 1] += " " + item;
    } else {
      mesclados.push(item);
    }
  }

  return mesclados
    .filter((b) => b.length > 10)
    .map((b) => ({
      titulo: b.slice(0, 80) + (b.length > 80 ? "…" : ""),
      descricao: b.slice(0, 1000),
    }));
}

export function classificarCondicionante(texto: string): "exigência" | "informativa" {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const padroesInformativa = [
    /\ba presente licen[ca]\b/,
    /\btrata[- ]se de\b/,
    /\bdiz respeito\b/,
    /\bdesta licen[ca]\b/,
    /\bdesta autorizacao\b/,
    /\bo objetivo\b/,
    /\bo empreendimento\b/,
    /\bo presente\b/,
    /\ba finalidade\b/,
    /\binformamos\b/,
    /\besta licen[ca]\b/,
    /\blhe informamos\b/,
    /\bmediante\b/,
  ];

  const padroesExigencia = [
    /\bdevera[sao]?\b/,
    /\bobrigatori[oa]\b/,
    /\bapresentar\b/,
    /\bobter\b/,
    /\brealizar\b/,
    /\bmanter\b/,
    /\bpossui?r\b/,
    /\bservir[- ]se\b/,
    /\bobservar\b/,
    /\bcumprir\b/,
    /\batender\b/,
    /\bfornecer\b/,
    /\bdisponibilizar\b/,
    /\binformar\b/,
    /\bcomunicar\b/,
    /\benviar\b/,
    /\bencaminhar\b/,
    /\bnao poder[aao]\b/,
    /\bnao dever[aao]\b/,
    /\bnao e permitido\b/,
    /\be proibido\b/,
    /\be vedado\b/,
    /\bdeve ser\b/,
    /\bdevem ser\b/,
    /\bdevem\b/,
    /\bdeve\b/,
  ];

  let scoreInformativa = 0;
  for (const p of padroesInformativa) {
    if (p.test(t)) scoreInformativa++;
  }

  let scoreExigencia = 0;
  for (const p of padroesExigencia) {
    if (p.test(t)) scoreExigencia++;
  }

  if (scoreInformativa > scoreExigencia) return "informativa";
  if (scoreExigencia > 0) return "exigência";
  return "informativa";
}

export async function extractFromBuffer(buffer: Buffer, ext: string): Promise<CamposLicenca> {
  const text = await extrairTextoComOcr(buffer, ext);
  const result = extractFields(text);
  return result;
}
