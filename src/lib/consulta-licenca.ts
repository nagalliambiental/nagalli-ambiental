import { consultarLicencaIat, type DadosLicenca } from "@/lib/iat";
import { consultarLicencaIma } from "@/lib/ima";
import { consultarSia } from "@/lib/sia";
import { consultarOutorgaSigarh, fromSigarh } from "@/lib/sigarh";

export type OrigemLicenca = "IAT" | "IMA" | "SIA" | "SIGARH";

export type LicencaImportada = {
  origem: OrigemLicenca;
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
};

function fromOrgao(d: DadosLicenca, origem: "IAT" | "IMA"): LicencaImportada {
  return {
    origem,
    orgaoSigla: origem,
    sistema: origem === "IAT" ? "SGA" : "IMA",
    modalidade: d.modalidade,
    validade: d.validade,
    atividade: d.atividade,
    municipio: d.municipio,
    uf: d.uf,
    protocolo: d.protocolo,
    licenca: d.licenca,
    emissao: d.emissao,
    condicionantes: "",
    razaoSocial: d.razaoSocial,
  };
}

function ehIma(sigla: string) {
  return sigla.includes("IMA");
}

function ehIat(sigla: string) {
  return sigla.includes("IAT") || sigla.includes("IAP");
}

export async function importarLicencaDoOrgao(opts: {
  licenca?: string;
  protocolo?: string;
  orgaoSigla?: string;
}): Promise<LicencaImportada | null> {
  const licenca = opts.licenca?.trim() || "";
  const protocolo = (opts.protocolo || "").replace(/\D/g, "");
  const sigla = (opts.orgaoSigla || "").toUpperCase();

  if (!licenca && !protocolo) return null;

  const ehOutorga = licenca.includes("/");

  const tentarSigarh = async (): Promise<LicencaImportada | null> => {
    if (!licenca) return null;
    try {
      const lista = await consultarOutorgaSigarh(licenca);
      if (lista?.[0]) return fromSigarh(lista[0], licenca);
    } catch {
      // não é outorga ou SIGARH indisponível
    }
    return null;
  };

  const tentarIat = async (): Promise<LicencaImportada | null> => {
    if (licenca) {
      try {
        const lista = await consultarLicencaIat({ licenca });
        if (lista?.[0]) return fromOrgao(lista[0], "IAT");
      } catch {
        // cai no SIA
      }
    }
    try {
      const sia = await consultarSia(
        licenca ? { licenca: licenca.replace(/\D/g, "") } : { protocolo }
      );
      if (!sia) return null;
      return {
        origem: "SIA",
        orgaoSigla: "IAT",
        sistema: "SGA",
        modalidade: sia.modalidade,
        validade: sia.dataValidade,
        atividade: sia.atividade,
        municipio: "",
        uf: "PR",
        protocolo: sia.protocolo,
        licenca: sia.numLicenca,
        emissao: sia.dataEmissao,
        condicionantes: sia.condicionantes,
        razaoSocial: sia.empreendedor,
      };
    } catch {
      return null;
    }
  };

  const tentarIma = async (): Promise<LicencaImportada | null> => {
    try {
      const lista = await consultarLicencaIma(
        licenca ? { licenca } : { protocolo }
      );
      if (lista?.[0]) return fromOrgao(lista[0], "IMA");
    } catch {
      return null;
    }
    return null;
  };

  if (ehIma(sigla)) return tentarIma();
  if (ehIat(sigla)) return tentarIat();

  if (ehOutorga) {
    const r = await tentarSigarh();
    if (r) return r;
  }

  const ordem = licenca.includes("/")
    ? [tentarIma, tentarIat]
    : [tentarIat, tentarIma];
  for (const tentar of ordem) {
    const r = await tentar();
    if (r) return r;
  }
  return null;
}
