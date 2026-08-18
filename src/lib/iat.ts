import { consultarCnpj } from "@/lib/cnpj";

const SGA_BASE_URL =
  "http://www.sga.pr.gov.br/sga-iap/consultarProcessoLicenciamento.do";

const SIGLA_MODALIDADE: Record<string, string> = {
  AA: "Autorização Ambiental",
  AF: "Autorização Florestal",
  LP: "Licença Prévia",
  LI: "Licença de Instalação",
  LO: "Licença de Operação",
  LAS: "Licença Ambiental Simplificada",
  LAC: "Licença Ambiental por Adesão e Compromisso",
  RLO: "Renovação de Licença de Operação",
  RLI: "Renovação de Licença de Instalação",
  RLAS: "Renovação de Licença Ambiental Simplificada",
  LOR: "Licença de Operação de Regularização",
  LASR: "Licença Ambiental Simplificada de Regularização",
  DLAE: "Declaração de Dispensa de Licenciamento Ambiental",
  DLAM: "Dispensa de Licenciamento Ambiental",
  CP: "Consulta Prévia",
};

export interface ResultadoSga {
  numProtocolo?: number;
  numProtocoloFormatado?: string;
  numDocumento?: number;
  numDocumentoFormatado?: string;
  siglaModalidade?: string;
  descAtividade?: string;
  descAtividadeEspecifica?: string;
  dtDecisaoFormatado?: string;
  dtValidadeFormatado?: string;
  nomeRazaoSocial?: string;
  municipioUfFormatado?: string;
  nomeMunicipio?: string;
  cpfCnpj?: string;
  siglaUf?: string;
  indSia?: boolean;
}

export interface DadosLicenca {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  licenca: string;
  protocolo: string;
  modalidade: string;
  atividade: string;
  municipio: string;
  uf: string;
  validade: string;
  emissao: string;
  orgao: string;
  urlDetalhe: string;
}

async function consultarSga(opts: {
  licenca?: string;
  cnpj?: string;
  nome?: string;
}): Promise<ResultadoSga[] | null> {
  const qs = new URLSearchParams({
    action: "consultarProcessoLicenciamento",
  });
  if (opts.licenca) qs.set("numDocumento", opts.licenca);
  if (opts.cnpj) qs.set("cpfCnpj", opts.cnpj);
  if (opts.nome) qs.set("nomeRazaoSocial", opts.nome);

  const res = await fetch(`${SGA_BASE_URL}?${qs.toString()}`, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`SGA respondeu ${res.status}`);
  const buf = await res.arrayBuffer();
  const texto = new TextDecoder("iso-8859-1").decode(buf);

  const jsonTexto = texto
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"');

  let json: {
    success?: boolean;
    total?: number;
    listaProcessoLicenciamento?: ResultadoSga[];
  };
  try {
    json = JSON.parse(jsonTexto);
  } catch {
    return null;
  }

  return json?.listaProcessoLicenciamento ?? [];
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

export async function consultarLicencaIat(opts: {
  licenca?: string;
  cnpj?: string;
  nome?: string;
}): Promise<DadosLicenca[] | null> {
  const limpos: typeof opts = {
    licenca: opts.licenca?.replace(/\D/g, "") || undefined,
    cnpj: opts.cnpj?.replace(/\D/g, "") || undefined,
    nome: opts.nome?.trim() || undefined,
  };
  if (!limpos.licenca && !limpos.cnpj && !limpos.nome) {
    throw new Error("Informe licença, CNPJ ou nome");
  }

  const itens = await consultarSga(limpos);
  if (!itens || itens.length === 0) return null;

  const resultados: DadosLicenca[] = [];
  for (const item of itens.slice(0, 10)) {
    const cnpj = item.cpfCnpj || "";
    let endereco = "";
    if (cnpj) {
      try {
        const empresa = await consultarCnpj(cnpj);
        if (empresa) {
          endereco = montarEndereco(empresa);
        }
      } catch {
        // endereço fica vazio se a consulta de CNPJ falhar
      }
    }

    resultados.push({
      razaoSocial: item.nomeRazaoSocial || "",
      cnpj,
      endereco,
      licenca: item.numDocumentoFormatado || String(item.numDocumento ?? ""),
      protocolo:
        item.numProtocoloFormatado || String(item.numProtocolo ?? ""),
      modalidade:
        SIGLA_MODALIDADE[item.siglaModalidade || ""] ||
        item.siglaModalidade ||
        "",
      atividade: item.descAtividadeEspecifica || item.descAtividade || "",
      municipio: item.nomeMunicipio || "",
      uf: item.siglaUf || "",
      validade: item.dtValidadeFormatado || "",
      emissao: item.dtDecisaoFormatado || "",
      orgao: "IAT — Instituto Água e Terra",
      urlDetalhe: `${SGA_BASE_URL}?action=exibirDadosPublicoLicenca&numProtocolo=${item.numProtocolo}&indSia=${item.indSia ? "true" : "false"}`,
    });
  }

  return resultados;
}