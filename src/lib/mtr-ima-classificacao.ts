import pdfParse from "pdf-parse/lib/pdf-parse.js";

export type ClasseMtrIma = "I" | "II A" | "II B";

export function normalizarClasseMtrIma(valor: string | null | undefined): string {
  const texto = String(valor || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (/^II\s*A$/.test(texto) || /\bIIA\b/.test(texto)) return "II A";
  if (/^II\s*B$/.test(texto) || /\bIIB\b/.test(texto)) return "II B";
  if (/^I$/.test(texto)) return "I";
  return "";
}

export function extrairClasseMtrIma(texto: string): string | null {
  const limpo = texto.replace(/\u00a0/g, " ");
  const rotulo = limpo.match(/Classe\s*[:\-]?\s*(II\s*A|II\s*B|I)(?=\b|[A-Z]\d)/i);
  if (rotulo) return normalizarClasseMtrIma(rotulo[1]);

  // No PDF do portal, a classe costuma vir colada ao estado físico:
  // "LíquidoIIAE04" ou "SólidoI...".
  const linha = limpo.match(/(?:S[ÓO]LIDO|L[ÍI]QUIDO|GASOSO|PASTOSO)\s*(II\s*A|II\s*B|I)(?=[A-Z]\d|\s|$)/i);
  return linha ? normalizarClasseMtrIma(linha[1]) : null;
}

export async function extrairClasseMtrImaPdf(buffer: Buffer): Promise<string | null> {
  const parsed = await pdfParse(buffer);
  return extrairClasseMtrIma(parsed.text || "");
}
