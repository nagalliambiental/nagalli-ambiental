import { runOcr, extrairTextoPdf, limparTextoPdf, extrairCnpj } from "./extract-license";

export interface CamposTpp {
  numero: string | null;
  cnpj: string | null;
  emitidoEm: string | null;
  validoAte: string | null;
  veiculos: string | null;
  classesRisco: string | null;
}

function detectarTpp(texto: string): boolean {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return t.includes("produtos perigosos") && t.includes("autorizacao ambiental");
}

const RE_PLACA = /^\s*(?:[-•*]\s*|\d{1,2}[.)\-]\s*)*([A-Z]{3}\d[A-Z0-9]\d{2})\s*(.*)$/i;
const RE_TIPO_VEICULO =
  /caminh[aã]o|cavalo\s+mec[aâ]nico|carreta|caminhonete|pick[- ]?up|\bvan\b|[\u00f4\u00f3]nibus|micro[- ]?\w{0,3}bus|equipamento|moto(?:cicleta)?|reboque|semirreboque|tanque/i;
const RE_QUALQUER_PLACA = /[A-Z]{3}\d[A-Z0-9]\d{2}/gi;

function primeiroNumeroRegistro(trecho: string): string | null {
  const re = /(\d[\d.,]*)(?!\/)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trecho)) !== null) {
    const n = m[1].replace(/[^\d]/g, "");
    if (n.length >= 5 && n.length <= 8) return n;
  }
  return null;
}

function extrairNumeroRegistro(texto: string): string | null {
  const rotulo =
    /registro\s+(?:no\s+)?banco\s+de\s*dados[^\d]{0,60}|banco\s+de\s*dados\s*(?:n\s*[ºo]?\.?\s*de\s+)?registro\s+[^\d]{0,40}/i;
  const m = texto.match(rotulo);
  if (m) {
    const trecho = texto.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 120);
    const n = primeiroNumeroRegistro(trecho);
    if (n) return n;
  }

  const cpf = texto.match(/cpf\s*\/\s*cnpj\s*[:\s]*([\d.\/-]+)/i);
  if (cpf) {
    const inicio = Math.max(0, (cpf.index ?? 0) - 80);
    const antes = texto.slice(inicio, cpf.index ?? 0);
    const nAntes = primeiroNumeroRegistro(antes);
    if (nAntes) return nAntes;

    const fim = (cpf.index ?? 0) + cpf[0].length;
    const depois = texto.slice(fim, fim + 120);
    const longa = depois.match(/^\s*(?:dados?|registro)\s*[:.\s]*(\d[\d.,]*)/i);
    if (longa) {
      const n = longa[1].replace(/[^\d]/g, "");
      if (n.length >= 5 && n.length <= 8) return n;
    }
  }

  return null;
}

function extrairVeiculos(texto: string): string | null {
  const linhas = texto.split("\n");
  const veiculos: string[] = [];
  const vistos = new Set<string>();
  const adicionar = (placa: string, tipo: string) => {
    const p = placa.toUpperCase();
    const t = tipo.trim();
    if (!t || vistos.has(p)) return;
    vistos.add(p);
    veiculos.push(`${p} — ${t}`);
  };

  for (const linha of linhas) {
    const tipo = linha.match(RE_TIPO_VEICULO);
    const placas = linha.match(RE_QUALQUER_PLACA);
    if (tipo && placas) {
      for (const p of placas) adicionar(p, tipo[0]);
      continue;
    }
    const m = linha.match(RE_PLACA);
    if (!m) continue;
    const resto = m[2]
      .trim()
      .replace(/^[-–—]\s*/, "")
      .replace(/^(?:N\s*\/\s*A\s*)+/, "")
      .replace(/^\d[\d.\/\s-]*/, "")
      .replace(/^(?:N\s*\/\s*A\s*)+/, "")
      .trim();
    if (!resto) continue;
    adicionar(m[1], resto);
  }

  return veiculos.length ? veiculos.join("\n") : null;
}

const NOMES_CLASSE = /(?:explosiv|gases|inflam|oxidant|perox|t[oó]xic|corros|radioativ|perigos[oa]s?\s+divers|subst[âa]ncias)/i;

function extrairClasses(texto: string): string | null {
  const classes: { n: number; desc: string }[] = [];
  const contradas = new Set<number>();

  const adicionar = (rawN: string, rawDesc: string) => {
    const n = Number(rawN);
    const desc = rawDesc.trim();
    if (n >= 1 && n <= 9 && desc && !contradas.has(n)) {
      contradas.add(n);
      classes.push({ n, desc });
    }
  };

  for (const linha of texto.split("\n")) {
    const mAnc = linha.match(/^\s*(?:[-•*]\s*|\d{1,2}[.)\-]\s*)*Classe\s+(\d{1,2})\s*[.:\-–—]\s*(.+)$/i);
    if (mAnc) {
      adicionar(mAnc[1], mAnc[2]);
      continue;
    }
    const re = /Classe\s+(\d{1,2})\s*[.:\-–—]\s*([^\n]+?)(?=\s+Classe\s+\d{1,2}\s*[.:\-–—]|$)/gi;
    let mt: RegExpExecArray | null;
    while ((mt = re.exec(linha)) !== null) adicionar(mt[1], mt[2]);
  }

  if (classes.length === 0) {
    const header = texto.match(/classes?\s+de\s+risco\b/i);
    if (header) {
      const secao = texto.slice((header.index ?? 0) + header[0].length).split(/\n{2,}/)[0];
      for (const linha of (secao || "").split("\n")) {
        const m2 = linha.match(/^\s*(?:[-•*]\s*)?(\d{1,2})\s*[-–]\s*(.+)$/i);
        if (!m2) continue;
        const n = Number(m2[1]);
        const desc = m2[2].trim();
        if (n >= 1 && n <= 9 && NOMES_CLASSE.test(desc) && !/\/\d{2}\//.test(desc)) adicionar(m2[1], m2[2]);
      }
    }
  }

  classes.sort((a, b) => a.n - b.n);
  return classes.length ? classes.map((c) => `Classe ${c.n} — ${c.desc}`).join("\n") : null;
}

export function extrairTpp(texto: string): CamposTpp {
  if (!detectarTpp(texto)) {
    return { numero: null, cnpj: null, emitidoEm: null, validoAte: null, veiculos: null, classesRisco: null };
  }

  const emitidoM = texto.match(/emitido\s+em:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const validadeM = texto.match(/v[aá]lido\s+at[eé]:\s*(\d{2}\/\d{2}\/\d{4})/i);

  return {
    numero: extrairNumeroRegistro(texto),
    cnpj: extrairCnpj(texto),
    emitidoEm: emitidoM ? emitidoM[1] : null,
    validoAte: validadeM ? validadeM[1] : null,
    veiculos: extrairVeiculos(texto),
    classesRisco: extrairClasses(texto),
  };
}

export async function extractTppFromBuffer(buffer: Buffer, ext: string): Promise<CamposTpp> {
  let textoLocal: string | null = null;
  if (ext === "pdf") {
    try {
      textoLocal = await extrairTextoPdf(buffer);
    } catch {
      textoLocal = null;
    }
  }

  let textoOcr: string | null = null;
  try {
    textoOcr = await runOcr(buffer, ext);
  } catch {
    textoOcr = null;
  }

  const candidatos = [textoOcr, textoLocal]
    .filter((t): t is string => !!t && t.replace(/\s+/g, "").length >= 20)
    .map(limparTextoPdf);

  let melhor: CamposTpp | null = null;
  let melhoresPontos = -1;
  for (const texto of candidatos) {
    const r = extrairTpp(texto);
    const qtd = [r.numero, r.cnpj, r.emitidoEm, r.validoAte, r.veiculos, r.classesRisco].filter(Boolean).length;
    const pontos = qtd * 10 + (r.numero ? 1 : 0) + (r.veiculos ? 1 : 0);
    if (pontos > melhoresPontos) {
      melhor = r;
      melhoresPontos = pontos;
    }
  }

  return melhor ?? { numero: null, cnpj: null, emitidoEm: null, validoAte: null, veiculos: null, classesRisco: null };
}