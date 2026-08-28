import { extrairTextoComOcr, extrairCnpj } from "./extract-license";

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

export function extrairTpp(texto: string): CamposTpp {
  if (!detectarTpp(texto)) {
    return { numero: null, cnpj: null, emitidoEm: null, validoAte: null, veiculos: null, classesRisco: null };
  }

  const numeroM = texto.match(/registro\s+no\s+banco\s+de\s*dados:\s*(\d[\d.]{4,})/i);
  const emitidoM = texto.match(/emitido\s+em:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const validadeM = texto.match(/v[aá]lido\s+at[eé]:\s*(\d{2}\/\d{2}\/\d{4})/i);

  const linhas = texto.split("\n");
  const veiculos: string[] = [];
  const classes: string[] = [];
  for (const linha of linhas) {
    const veiculoM = linha.match(/^\s*([A-Z]{3}\d[A-Z0-9]\d{2})\s*(.*)$/i);
    if (veiculoM) {
      const resto = veiculoM[2].replace(/^(?:N\s*\/\s*A\s*|\d[\d.\s-]*)/, "").trim();
      if (resto) veiculos.push(`${veiculoM[1].toUpperCase()} — ${resto}`);
      continue;
    }
    const classeM = linha.match(/^\s*Classe\s+(\d+)[.: ]\s*(.+)$/i);
    if (classeM) {
      classes.push(`Classe ${classeM[1]} — ${classeM[2].trim()}`);
    }
  }

  return {
    numero: numeroM ? numeroM[1].trim() : null,
    cnpj: extrairCnpj(texto),
    emitidoEm: emitidoM ? emitidoM[1] : null,
    validoAte: validadeM ? validadeM[1] : null,
    veiculos: veiculos.length ? veiculos.join("\n") : null,
    classesRisco: classes.length ? classes.join("\n") : null,
  };
}

export async function extractTppFromBuffer(buffer: Buffer, ext: string): Promise<CamposTpp> {
  const texto = await extrairTextoComOcr(buffer, ext);
  return extrairTpp(texto);
}