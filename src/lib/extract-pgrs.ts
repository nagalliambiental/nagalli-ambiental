import { extractFields, extractFromBuffer, extrairTextoComOcr } from "./extract-license";

export interface CamposPgrs {
  validade: string | null;
  deferidoEm: string | null;
  numero: string | null;
  orgao: string | null;
}

const D = String.raw`(\d{2})\/(\d{2})\/(\d{4})`;

function paraIso(m: RegExpMatchArray | null): string | null {
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  return `${aaaa}-${mm}-${dd}`;
}

function extrairData(texto: string, padroes: RegExp[]): string | null {
  for (const padrao of padroes) {
    const iso = paraIso(texto.match(padrao));
    if (iso) return iso;
  }
  return null;
}

const PADROES_VALIDADE: RegExp[] = [
  new RegExp(`validade(?:\\s+do\\s+pgrs)?\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`v[aá]lid[oa]\\s+at[eé]\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`vigente\\s+at[eé]\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`prazo\\s+de\\s+validade(?:\\s+at[eé])?\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`vencimento(?:\\s+do\\s+pgrs)?\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`vence\\s+em\\s*[:\\-]?\\s*${D}`, "i"),
];

const PADROES_DEFERIMENTO: RegExp[] = [
  new RegExp(`data\\s+do\\s+deferimento\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`deferido\\s+em\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`deferimento\\s*[:\\-]?\\s*${D}`, "i"),
  /data\s*\n\s*(\d{2})\/(\d{2})\/(\d{4})\s*\n\s*resultado/i,
  new RegExp(`publicad[oa]\\s+(?:em|no dia)\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`data\\s+de\\s+publica[çc][ãa]o\\s*[:\\-]?\\s*${D}`, "i"),
  new RegExp(`assinad[oa]\\s+em\\s*[:\\-]?\\s*${D}`, "i"),
];

const PADROES_NUMERO: RegExp[] = [
  /protocolo\s*\n\s*(\d[\d.\/\-]{5,})/i,
  /protocolo\s+(?:n[ºo°]\s*)?[:\-]?\s*(\d{6,})/i,
  /n[úu]mero\s+do\s+protocolo\s*[:\-]?\s*(\d[\d.\/\-]{5,})/i,
];

const PADROES_ORGAO: RegExp[] = [
  /(prefeitura\s+municipal\s+d[ae]\s+[^\n]+)/i,
  /(governo\s+do\s+estado\s+d[ae]\s+[^\n]+)/i,
  /(secretaria\s+municipal\s+d[ae]\s+meio\s+ambiente[^\n]*)/i,
];

function extrairNumero(texto: string): string | null {
  for (const padrao of PADROES_NUMERO) {
    const m = texto.match(padrao);
    if (m) return m[1].trim();
  }
  return null;
}

function extrairOrgao(texto: string): string | null {
  for (const padrao of PADROES_ORGAO) {
    const m = texto.match(padrao);
    if (m) return m[1].trim();
  }
  return null;
}

export async function extractPgrsFromBuffer(buffer: Buffer, ext: string): Promise<CamposPgrs> {
  let texto = "";
  try {
    texto = await extrairTextoComOcr(buffer, ext);
  } catch {
    texto = "";
  }

  if (!texto.trim()) {
    const campos = await extractFromBuffer(buffer, ext);
    return {
      validade: campos.validade,
      deferidoEm: null,
      numero: campos.numProtocolo || campos.numLicenca,
      orgao: campos.orgaoSigla,
    };
  }

  const campos = extractFields(texto);
  return {
    validade: extrairData(texto, PADROES_VALIDADE) ?? campos.validade,
    deferidoEm: extrairData(texto, PADROES_DEFERIMENTO) ?? campos.dataProtocolo,
    numero: extrairNumero(texto) ?? campos.numProtocolo ?? campos.numLicenca,
    orgao: extrairOrgao(texto) ?? campos.orgaoSigla,
  };
}
