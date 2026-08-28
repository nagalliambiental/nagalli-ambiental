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

function extrairNumeroRegistro(texto: string): string | null {
  const m = texto.match(
    /(?:n[ºo]\.?\s*de\s*)?registro\s+(?:no\s+)?banco\s+de\s*dados[^\d]{0,60}(\d{5,8})(?:\.\d{3})?(?!\d)/i
  );
  return m ? m[1] : null;
}

function extrairVeiculos(texto: string): string | null {
  const linhas = texto.split("\n");
  const veiculos: string[] = [];
  const vistos = new Set<string>();
  for (const linha of linhas) {
    const m = linha.match(RE_PLACA);
    if (!m) continue;
    const placa = m[1].toUpperCase();
    let resto = m[2].trim();
    resto = resto
      .replace(/^[-–—]\s*/, "")
      .replace(/^(?:N\s*\/\s*A\s*)+/, "")
      .replace(/^\d[\d.\/\s-]*/, "")
      .replace(/^(?:N\s*\/\s*A\s*)+/, "")
      .trim();
    if (!resto || vistos.has(placa)) continue;
    vistos.add(placa);
    veiculos.push(`${placa} — ${resto}`);
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
  let melhoresCampos = -1;
  for (const texto of candidatos) {
    const r = extrairTpp(texto);
    const qtd = [r.numero, r.cnpj, r.emitidoEm, r.validoAte, r.veiculos, r.classesRisco].filter(Boolean).length;
    if (qtd > melhoresCampos) {
      melhor = r;
      melhoresCampos = qtd;
    }
    if (melhoresCampos >= 5) break;
  }

  return melhor ?? { numero: null, cnpj: null, emitidoEm: null, validoAte: null, veiculos: null, classesRisco: null };
}