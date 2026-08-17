const BASE_URL = "https://www.sigarh.iat.pr.gov.br";
const FORM_PATH = "/sigarh-scrh/pages/compartilhados/outorgarh/formulario.xhtml";
const FORM_URL = `${BASE_URL}${FORM_PATH}`;

export type FiltroOutorga =
  | "NOME_USUARIO"
  | "CPF_CNPJ_USUARIO"
  | "NUMERO_PROTOCOLO"
  | "NUMERO_PORTARIA";

export interface DadosOutorga {
  portaria: string;
  usuario: string;
  empreendimento: string;
  municipio: string;
  tipoInterferencia: string;
  tipoDocumento: string;
  vazaoMaxima: string;
  dataPublicacao: string;
  dataVencimento: string;
  resultado: string;
  status: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function cleanText(s: string): string {
  return stripTags(decodeEntities(s)).replace(/\s+/g, " ").trim();
}

async function fetchHtml(
  url: string,
  headers?: Record<string, string>,
  method: "GET" | "POST" = "GET",
  body?: string
): Promise<{ texto: string; cookies: string }> {
  const res = await fetch(url, {
    method,
    body,
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`SIGARH respondeu ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  const buf = await res.arrayBuffer();
  return { texto: new TextDecoder("utf-8").decode(buf), cookies };
}

function extrairViewState(html: string): string {
  const re = /<input[^>]*name="javax\.faces\.ViewState"[^>]*value="([^"]*)"[^>]*>/g;
  let m: RegExpExecArray | null;
  const valores: string[] = [];
  while ((m = re.exec(html)) !== null) valores.push(m[1]);
  const dentroFormMain = html.match(
    /<form[^>]*id="formMainContent"[^>]*>([\s\S]*?)<\/form>/i
  );
  if (dentroFormMain) {
    const local = dentroFormMain[1].match(
      /<input[^>]*name="javax\.faces\.ViewState"[^>]*value="([^"]*)"[^>]*>/
    );
    if (local) return local[1];
  }
  return valores[0] || "";
}

function extrairActionUrl(html: string): string {
  const m = html.match(
    /<form[^>]*id="formMainContent"[^>]*action="([^"]*)"/i
  );
  if (m && m[1]) {
    return m[1].startsWith("http") ? m[1] : `${BASE_URL}${m[1]}`;
  }
  return FORM_URL;
}

function parseResultados(html: string): DadosOutorga[] {
  const resultados: DadosOutorga[] = [];

  const tbodyMatch = html.match(/<tbody[^>]*id="publicacoes_data"[^>]*>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return resultados;

  const tbody = tbodyMatch[1];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(tbody)) !== null) {
    const row = m[1];
    if (row.includes("ui-datatable-empty-message")) continue;
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(
      (c) => c[1]
    );
    if (cells.length < 10) continue;

    const empreendimentoRaw = cleanText(cells[2]);
    const municipioMatch = empreendimentoRaw.match(/\(([^)]*)\)\s*$/);
    const empreendimento = municipioMatch
      ? empreendimentoRaw.replace(/\s*\([^)]*\)\s*$/, "").trim()
      : empreendimentoRaw;
    const municipio = municipioMatch ? municipioMatch[1].trim() : "";

    resultados.push({
      portaria: cleanText(cells[0]),
      usuario: cleanText(cells[1]),
      empreendimento,
      municipio,
      tipoInterferencia: cleanText(cells[3]),
      tipoDocumento: cleanText(cells[4]),
      vazaoMaxima: cleanText(cells[5]),
      dataPublicacao: cleanText(cells[6]),
      dataVencimento: cleanText(cells[7]),
      resultado: cleanText(cells[8]),
      status: cleanText(cells[9]),
    });
  }

  return resultados;
}

export async function consultarOutorga(opts: {
  protocolo?: string;
  portaria?: string;
  nome?: string;
  cpfCnpj?: string;
}): Promise<DadosOutorga[] | null> {
  let filtro: FiltroOutorga | null = null;
  let valor = "";

  if (opts.protocolo) {
    filtro = "NUMERO_PROTOCOLO";
    valor = opts.protocolo.replace(/\D/g, "");
  } else if (opts.portaria) {
    filtro = "NUMERO_PORTARIA";
    valor = opts.portaria.trim();
  } else if (opts.nome) {
    filtro = "NOME_USUARIO";
    valor = opts.nome.trim();
  } else if (opts.cpfCnpj) {
    filtro = "CPF_CNPJ_USUARIO";
    valor = opts.cpfCnpj.replace(/\D/g, "");
  }

  if (!filtro || !valor) {
    throw new Error("Informe protocolo, portaria, nome ou CPF/CNPJ");
  }

  const { texto, cookies } = await fetchHtml(FORM_URL);
  const viewState = extrairViewState(texto);
  if (!viewState) throw new Error("SIGARH indisponível (sem ViewState)");
  const postUrl = extrairActionUrl(texto);

  const body = new URLSearchParams({
    "formMainContent": "formMainContent",
    "javax.faces.ViewState": viewState,
    "javax.faces.partial.ajax": "true",
    "javax.faces.source": "j_idt79",
    "javax.faces.partial.execute": "panelPesquisa",
    "javax.faces.partial.render": "panelPublicacoes",
    "j_idt79": "j_idt79",
    "selectFiltroPesquisa_input": filtro,
    "inputValorFiltroPesquisa": valor,
    "j_idt30_active": "0",
  });

  const { texto: resultado, cookies: cookies2 } = await fetchHtml(
    postUrl,
    {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Faces-Request": "partial/ajax",
      "X-Requested-With": "XMLHttpRequest",
      "Cookie": cookies,
      "Accept": "application/xml, text/xml, */*",
    },
    "POST",
    body.toString()
  );
  void cookies2;

  return parseResultados(resultado);
}