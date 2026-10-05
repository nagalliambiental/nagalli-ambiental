import { extrairTextoComOcr, dividirTextoEmItens } from "@/lib/extract-license";

export interface ItemTarefaPdf {
  titulo: string;
  descricao: string;
  prazoFinal: string | null;
}

const MESES: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

function paraMeioDia(ano: number, mes: number, dia: number): string | null {
  const d = new Date(ano, mes, dia, 12);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function extrairPrazoDoTexto(texto: string): string | null {
  const br = texto.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
  if (br) {
    let ano = Number(br[3]);
    if (ano < 100) ano += 2000;
    if (ano >= 1990 && ano <= 2100) {
      const d = paraMeioDia(ano, Number(br[2]) - 1, Number(br[1]));
      if (d) return d;
    }
  }

  const iso = texto.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const d = paraMeioDia(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (d) return d;
  }

  const ext = normalizar(texto).match(/\b(\d{1,2})\s+de\s+([a-z]{3,})(?:\s+(?:de\s+)?(20\d{2}))?\b/);
  if (ext && MESES[ext[2].slice(0, 8)] !== undefined) {
    const ano = ext[3] ? Number(ext[3]) : new Date().getFullYear();
    const d = paraMeioDia(ano, MESES[ext[2].slice(0, 8)], Number(ext[1]));
    if (d) return d;
  }

  return null;
}

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function extrairTarefasDeArquivo(
  buffer: Buffer,
  ext: string
): Promise<ItemTarefaPdf[]> {
  const texto = await extrairTextoComOcr(buffer, ext);
  if (texto.replace(/\s+/g, "").length < 30) {
    throw new Error(
      "Não foi possível ler texto do documento. Verifique se o arquivo está nítido e tente novamente."
    );
  }

  let itens = dividirTextoEmItens(texto).map((i) => ({
    titulo: i.titulo,
    descricao: i.descricao,
    prazoFinal: extrairPrazoDoTexto(i.descricao),
  }));

  if (itens.length === 0) {
    itens = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 12)
      .slice(0, 100)
      .map((l) => ({
        titulo: l.slice(0, 80) + (l.length > 80 ? "…" : ""),
        descricao: l.slice(0, 1000),
        prazoFinal: extrairPrazoDoTexto(l),
      }));
  }

  return itens.slice(0, 200);
}
