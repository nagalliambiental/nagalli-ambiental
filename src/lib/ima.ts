import { consultarCnpj } from "@/lib/cnpj";
import type { DadosLicenca } from "@/lib/iat";

const IMA_CONSULTA_URL = "https://consultas.ima.sc.gov.br/consulta/consultar";

export interface ResultadoIma {
  fce?: string;
  razaoSocial?: string;
  cnpj?: string;
  atividadeConsema?: string;
  dtEntrada?: string;
  faseDescricao?: string;
  numeroDocumento?: string;
  municipio?: string;
  fce_processo_tipo?: string;
}

interface DetalheIma {
  modalidade?: string;
  situacao?: string;
  validade?: string;
  endereco?: string;
  bairro?: string;
  municipio?: string;
  urlPdf?: string;
}

function limparTexto(texto: string): string {
  return texto.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export async function consultarConsultaIma(opts: {
  licenca?: string;
  cnpj?: string;
  nome?: string;
  protocolo?: string;
}): Promise<ResultadoIma[]> {
  const body = new URLSearchParams({
    protocolo: opts.protocolo || "",
    documento: opts.licenca || "",
    cnpj: opts.cnpj || "",
    razaoSocial: opts.nome || "",
    municipio: "",
    bairro: "",
    logradouro: "",
    "g-recaptcha-response": "",
  });

  const res = await fetch(IMA_CONSULTA_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });
  if (!res.ok) throw new Error(`IMA respondeu ${res.status}`);
  const dados = (await res.json()) as ResultadoIma[];
  return Array.isArray(dados) ? dados : [];
}

async function buscarDetalhe(
  fce: string,
  tipo: string,
  numeroDocumento: string
): Promise<DetalheIma | null> {
  const numeroSemBarra = numeroDocumento.replace(/\//g, "-");
  const url = `https://consultas.ima.sc.gov.br/consulta/visualizar/${encodeURIComponent(fce)}/${encodeURIComponent(tipo)}/${encodeURIComponent(numeroSemBarra)}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const campo = (rotulo: string): string => {
    const esc = rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = html.match(
      new RegExp(`<dt[^>]*>\\s*${esc}:?\\s*</dt>\\s*<dd[^>]*>(.*?)</dd>`, "s")
    );
    if (m) return limparTexto(m[1].replace(/<[^>]+>/g, ""));
    const m2 = html.match(
      new RegExp(`<strong>\\s*${esc}:?\\s*</strong>\\s*([^<]+)`, "s")
    );
    return m2 ? limparTexto(m2[1]) : "";
  };

  const tituloMatch = html.match(/<h3>([^<]+)<\/h3>/);
  const situacaoMatch = html.match(/<h5[^>]*>\s*(VIGENTE|VENCIDA)\s*<\/h5>/);
  const urlPdf = html.match(/href="(https:\/\/apidocs\.ima\.sc\.gov\.br\/[^"]+\.pdf)"/);

  const endereco = campo("Endereço");
  const bairro = campo("Bairro");
  const municipio = campo("Município");
  const enderecoCompleto = [endereco, bairro, municipio]
    .filter(Boolean)
    .join(", ");

  return {
    modalidade: tituloMatch
      ? limparTexto(tituloMatch[1].replace(/\s*Nº?\s*[0-9]+\/.*$/i, ""))
      : "",
    situacao: situacaoMatch ? situacaoMatch[1] : "",
    validade: campo("Validade"),
    endereco: enderecoCompleto,
    bairro,
    municipio,
    urlPdf: urlPdf ? urlPdf[1] : "",
  };
}

function montarEndereco(dados: {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}): string {
  return [
    [dados.logradouro, dados.numero].filter(Boolean).join(", "),
    dados.complemento,
    dados.bairro,
    [dados.municipio, dados.uf].filter(Boolean).join("/"),
    dados.cep,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function consultarLicencaIma(opts: {
  licenca?: string;
  cnpj?: string;
  nome?: string;
  protocolo?: string;
}): Promise<DadosLicenca[] | null> {
  const limpos: typeof opts = {
    licenca: opts.licenca?.trim() || undefined,
    cnpj: opts.cnpj?.replace(/\D/g, "") || undefined,
    nome: opts.nome?.trim() || undefined,
    protocolo: opts.protocolo?.replace(/\D/g, "") || undefined,
  };
  if (!limpos.licenca && !limpos.cnpj && !limpos.nome && !limpos.protocolo) {
    throw new Error("Informe licença, protocolo, CNPJ ou nome");
  }

  const itens = await consultarConsultaIma(limpos);
  if (!itens || itens.length === 0) return null;

  const resultados: DadosLicenca[] = [];
  for (const item of itens.slice(0, 10)) {
    const fce = item.fce || "";
    const tipo = item.fce_processo_tipo || "";
    const numeroDocumento = item.numeroDocumento || "";

    let detalhe: DetalheIma | null = null;
    if (fce && tipo && numeroDocumento && numeroDocumento !== "-") {
      try {
        detalhe = await buscarDetalhe(fce, tipo, numeroDocumento);
      } catch {
        detalhe = null;
      }
    }

    let endereco = detalhe?.endereco || "";
    const cnpj = item.cnpj || "";
    if (!endereco && cnpj) {
      try {
        const empresa = await consultarCnpj(cnpj);
        if (empresa) endereco = montarEndereco(empresa);
      } catch {
        // endereço fica vazio se a consulta de CNPJ falhar
      }
    }

    resultados.push({
      razaoSocial: item.razaoSocial || "",
      cnpj,
      endereco,
      licenca: numeroDocumento,
      protocolo: fce,
      modalidade: detalhe?.modalidade || "",
      atividade: item.atividadeConsema || "",
      municipio: detalhe?.municipio || item.municipio || "",
      uf: "SC",
      validade: detalhe?.validade || "",
      emissao: item.dtEntrada || "",
      orgao: "IMA — Instituto do Meio Ambiente de Santa Catarina",
      urlDetalhe: `https://consultas.ima.sc.gov.br/consulta/visualizar/${encodeURIComponent(fce)}/${encodeURIComponent(tipo)}/${encodeURIComponent(numeroDocumento.replace(/\//g, "-"))}`,
    });
  }

  return resultados;
}