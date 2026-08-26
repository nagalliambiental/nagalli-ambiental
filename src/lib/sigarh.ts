const SIGARH_URL =
  "https://geosigarh.iat.pr.gov.br/server/rest/services/Prod_LGPD/SIG_AGUASPARANA_Prod_LGPD/MapServer/0/query";

export interface ResultadoSigarh {
  nrPortaria: string;
  stPortaria: string;
  nmRequerente: string;
  nrCpfCnpj: string;
  dtPublicacao: string;
  dtVencimento: string;
  dtCriacao: string;
  nrProtocolo: string;
  nmEmpreendimento: string;
  nmTipoDocumento: string;
  nmTipoInterferencia: string;
  nmMunicipioEmp: string;
  nmStatusTramitacao: string;
}

function epochMsToDateBR(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function consultarOutorgaSigarh(
  portaria: string
): Promise<ResultadoSigarh[]> {
  const clean = portaria.trim().replace(/\s+/g, "");
  if (!clean) return [];

  let where = `nr_portaria = '${clean}'`;
  let params = new URLSearchParams({
    where,
    outFields:
      "nr_portaria,st_portaria,nm_requerente,nr_cpf_cnpj,dt_publicacao,dt_vencimento,dt_criacao,nr_e_protocolo,nm_empreendimento,nm_tipo_documento,nm_tipo_interferencia,nm_municipio_emp,nm_status_tramitacao",
    f: "json",
    returnGeometry: "false",
  });

  let res = await fetch(`${SIGARH_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  if (!res.ok) throw new Error(`SIGARH respondeu ${res.status}`);
  let json = await res.json();

  let features = (json?.features as { attributes: Record<string, unknown> }[] | undefined) ?? [];

  if (features.length === 0) {
    where = `UPPER(nr_portaria) LIKE '%${clean.toUpperCase().replace(/'/g, "''")}%'`;
    params = new URLSearchParams({
      where,
      outFields:
        "nr_portaria,st_portaria,nm_requerente,nr_cpf_cnpj,dt_publicacao,dt_vencimento,dt_criacao,nr_e_protocolo,nm_empreendimento,nm_tipo_documento,nm_tipo_interferencia,nm_municipio_emp,nm_status_tramitacao",
      f: "json",
      returnGeometry: "false",
    });
    res = await fetch(`${SIGARH_URL}?${params.toString()}`, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`SIGARH respondeu ${res.status}`);
    json = await res.json();
    features = (json?.features as { attributes: Record<string, unknown> }[] | undefined) ?? [];
  }

  if (features.length === 0) return [];

  const cleanUpper = clean.toUpperCase();
  features.sort((a, b) => {
    const aMatch = String(a.attributes.nr_portaria ?? "").toUpperCase() === cleanUpper ? 0 : 1;
    const bMatch = String(b.attributes.nr_portaria ?? "").toUpperCase() === cleanUpper ? 0 : 1;
    return aMatch - bMatch;
  });

  return features.map((f) => {
    const a = f.attributes;
    return {
      nrPortaria: String(a.nr_portaria ?? ""),
      stPortaria: String(a.st_portaria ?? ""),
      nmRequerente: String(a.nm_requerente ?? ""),
      nrCpfCnpj: String(a.nr_cpf_cnpj ?? ""),
      dtPublicacao: epochMsToDateBR(Number(a.dt_publicacao ?? 0)),
      dtVencimento: epochMsToDateBR(Number(a.dt_vencimento ?? 0)),
      dtCriacao: epochMsToDateBR(Number(a.dt_criacao ?? 0)),
      nrProtocolo: String(a.nr_e_protocolo ?? ""),
      nmEmpreendimento: String(a.nm_empreendimento ?? ""),
      nmTipoDocumento: String(a.nm_tipo_documento ?? ""),
      nmTipoInterferencia: String(a.nm_tipo_interferencia ?? ""),
      nmMunicipioEmp: String(a.nm_municipio_emp ?? ""),
      nmStatusTramitacao: String(a.nm_status_tramitacao ?? ""),
    };
  });
}

export function fromSigarh(
  r: ResultadoSigarh,
  portariaInformada: string
): {
  origem: "SIGARH";
  orgaoSigla: string;
  sistema: string;
  modalidade: string;
  validade: string;
  atividade: string;
  municipio: string;
  uf: string;
  protocolo: string;
  licenca: string;
  emissao: string;
  condicionantes: string;
  razaoSocial: string;
} {
  const numero = r.nrPortaria;
  return {
    origem: "SIGARH",
    orgaoSigla: "IAT",
    sistema: "SIGARH",
    modalidade: r.nmTipoDocumento,
    validade: r.dtVencimento,
    atividade: r.nmTipoInterferencia,
    municipio: r.nmMunicipioEmp,
    uf: "PR",
    protocolo: r.nrProtocolo || r.nrPortaria,
    licenca: portariaInformada || r.nrPortaria,
    emissao: r.dtCriacao || r.dtPublicacao,
    condicionantes: "",
    razaoSocial: r.nmRequerente,
  };
}
