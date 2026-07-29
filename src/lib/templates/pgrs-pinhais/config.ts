export const PGRS_PINHAIS_SLUG = "pgrs-pinhais";

export interface ResiduoInput {
  pontoGeracao: string;
  residuosGerados: string;
  quantificacao: string;
  acondicionamento: string;
  armazenamento: string;
  coletaInterna?: string;
  empresaTransporte: string;
  empresaDisposicaoFinal: string;
}

export interface EmpresaContratadaInput {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  numeroDataValidadeLicenca: string;
}

export interface AnexoInput {
  anexado: "SIM" | "NAO";
  justificativa?: string;
}

export interface PgrsPinhaisFormData {
  residuosPerigosos: ResiduoInput[];
  residuosNaoReciclaveis: ResiduoInput[];
  residuosReciclaveis: ResiduoInput[];
  empresasContratadas: EmpresaContratadaInput[];
  observacoesGerais: string;
  anexo1: AnexoInput;
  anexo2: AnexoInput;
  anexo3: AnexoInput;
  anexo4: AnexoInput;
  responsavelAssinaturaNome: string;
  responsavelAssinaturaCargo: string;
}

export const ANEXO_LABELS: Record<"anexo1" | "anexo2" | "anexo3" | "anexo4", string> = {
  anexo1: "Fotos dos locais de acondicionamento e armazenamento de resíduos",
  anexo2: "Contratos com as empresas terceirizadas",
  anexo3: "Comprovantes recentes de coleta e destinação final",
  anexo4: "Licenças de operação ou autorizações ambientais das empresas terceirizadas",
};

export const emptyResiduo = (): ResiduoInput => ({
  pontoGeracao: "",
  residuosGerados: "",
  quantificacao: "",
  acondicionamento: "",
  armazenamento: "",
  coletaInterna: "",
  empresaTransporte: "",
  empresaDisposicaoFinal: "",
});

export const emptyEmpresaContratada = (): EmpresaContratadaInput => ({
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  numeroDataValidadeLicenca: "",
});

export const emptyPgrsFormData = (): PgrsPinhaisFormData => ({
  residuosPerigosos: [emptyResiduo()],
  residuosNaoReciclaveis: [emptyResiduo()],
  residuosReciclaveis: [emptyResiduo()],
  empresasContratadas: [emptyEmpresaContratada()],
  observacoesGerais: "",
  anexo1: { anexado: "SIM", justificativa: "" },
  anexo2: { anexado: "SIM", justificativa: "" },
  anexo3: { anexado: "SIM", justificativa: "" },
  anexo4: { anexado: "SIM", justificativa: "" },
  responsavelAssinaturaNome: "",
  responsavelAssinaturaCargo: "",
});
