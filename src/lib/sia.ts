const BASE_URL = "https://celepar7.pr.gov.br/sia/licenciamento/consulta";

export interface DadosSia {
  id: string;
  modalidade: string;
  protocolo: string;
  numLicenca: string;
  dataEmissao: string;
  dataValidade: string;
  condicionantes: string;
  empreendedor: string;
  empreendimento: string;
  atividade: string;
  urlDetalhe: string;
}

interface ResultadoBusca {
  id: string;
  modalidade: string;
  protocolo: string;
  licenca: string;
  atividade: string;
  emissao: string;
  vencimento: string;
  empreendedor: string;
  empreendimento: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&aacute;/gi, "á")
    .replace(/&Aacute;/gi, "Á")
    .replace(/&eacute;/gi, "é")
    .replace(/&Eacute;/gi, "É")
    .replace(/&iacute;/gi, "í")
    .replace(/&Iacute;/gi, "Í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&Oacute;/gi, "Ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&Uacute;/gi, "Ú")
    .replace(/&atilde;/gi, "ã")
    .replace(/&Atilde;/gi, "Ã")
    .replace(/&otilde;/gi, "õ")
    .replace(/&Otilde;/gi, "Õ")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&Ccedil;/gi, "Ç")
    .replace(/&nbsp;/gi, " ");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function removeComments(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, "");
}

function cleanText(s: string): string {
  return stripTags(decodeEntities(s)).replace(/\s+/g, " ").trim();
}

function cleanCondicionantes(s: string): string {
  let t = stripTags(decodeEntities(s));
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/\t/g, " ");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`SIA/IAP respondeu ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buf);
}

function parseResultados(html: string): ResultadoBusca[] {
  const resultados: ResultadoBusca[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const row = removeComments(m[1]);
    const idMatch = row.match(/view_licenca\.asp\?id=(\d+)/);
    if (!idMatch) continue;
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(
      (c) => c[1]
    );
    if (cells.length < 13) continue;
    const cell = (i: number) => (cells[i] ? cleanText(cells[i]) : "");
    resultados.push({
      id: idMatch[1],
      modalidade: cell(3),
      protocolo: cell(4),
      licenca: cell(7),
      atividade: cell(8),
      emissao: cell(9),
      vencimento: cell(10),
      empreendedor: cell(11),
      empreendimento: cell(12),
    });
  }
  return resultados;
}

function parseDetalhe(html: string, base: ResultadoBusca): DadosSia {
  const limpo = removeComments(html);

  const m = limpo.match(
    /<td class="form_label"[^>]*>([\s\S]*?)<\/td>\s*<td class="form_labelCenter"[^>]*>([\s\S]*?)<\/td>\s*<td class="form_labelCenter"[^>]*>([\s\S]*?)<\/td>\s*<td class="form_labelCenter"[^>]*>([\s\S]*?)<\/td>\s*<td class="form_labelCenter"[^>]*>([\s\S]*?)<\/td>/
  );

  const condRe = limpo.match(
    /<td class="descricaoRel"[^>]*>\s*Condicionantes\s*<\/td>\s*<\/tr>\s*<tr>\s*<td class="form_label"[^>]*>([\s\S]*?)<\/td>/
  );

  return {
    id: base.id,
    modalidade: m ? cleanText(m[1]) : base.modalidade,
    protocolo: m ? cleanText(m[2]) : base.protocolo,
    numLicenca: m ? cleanText(m[3]) : base.licenca,
    dataEmissao: m ? cleanText(m[4]) : base.emissao,
    dataValidade: m ? cleanText(m[5]) : base.vencimento,
    condicionantes: condRe ? cleanCondicionantes(condRe[1]) : "",
    empreendedor: base.empreendedor,
    empreendimento: base.empreendimento,
    atividade: base.atividade,
    urlDetalhe: `${BASE_URL}/view_licenca.asp?id=${base.id}`,
  };
}

export async function consultarSia(opts: {
  protocolo?: string;
  licenca?: string;
}): Promise<DadosSia | null> {
  const qs = new URLSearchParams({ cont: "0", topValor: "10" });
  if (opts.protocolo) qs.set("protocolo", opts.protocolo);
  if (opts.licenca) qs.set("licenca", opts.licenca);

  const html = await fetchHtml(`${BASE_URL}/con_licenca_ajax.asp?${qs.toString()}`);
  const resultados = parseResultados(html);
  if (resultados.length === 0) return null;

  const primeiro = resultados[0];
  const detalheHtml = await fetchHtml(
    `${BASE_URL}/view_licenca.asp?id=${primeiro.id}`
  );
  return parseDetalhe(detalheHtml, primeiro);
}
