export const PGRCC_IAT_SLUG = "pgrcc-iat";

export interface CaracterizacaoRow {
  id: string;
  demolicao: string;
  construcao: string;
  especificar?: string;
}

export interface ReutilizacaoRow {
  id: string;
  processo: string;
  quantidade: string;
  especificar?: string;
}

export interface AcondicionamentoRow {
  id: string;
  forma: string;
  especificar?: string;
}

export interface TransporteRow {
  id: string;
  empresa: string;
  licenca: string;
}

export interface DestinacaoRow {
  id: "a" | "b" | "c" | "d";
  empresa: string;
  licenca: string;
  endereco: string;
  orgao: string;
  municipio: string;
  validade: string;
  indicacaoFiscal: string;
}

export interface PgrccIatFormData {
  clienteRazaoSocial: string;
  clienteNomeFantasia: string;
  clienteEndereco: string;
  clienteCpfCnpj: string;
  responsavelLegal1: string;
  responsavelLegal1Cpf: string;
  responsavelLegal2: string;
  responsavelLegal2Cpf: string;
  clienteTelefone: string;
  clienteEmail: string;

  elabRazaoSocial: string;
  elabEndereco: string;
  elabCnpj: string;
  elabResponsavelLegal: string;
  elabTelefone: string;
  elabEmail: string;

  empNome: string;
  empIndicacaoFiscal: string;
  empTelefone: string;
  empEmail: string;
  empLicencaPrevia: string;
  empModalidade: string;
  empRua: string;
  empNumero: string;
  empBairro: string;
  empMunicipio: string;
  empProcessoConstrutivo: string;
  empMetragem: string;
  empInicioObra: string;
  empTerminoObra: string;

  respElabNome: string;
  respElabConselho: string;
  respElabArt: string;
  respElabEmpresa: string;
  respElabEndereco: string;
  respElabTelefone: string;
  respElabEmail: string;

  respImplNome: string;
  respImplCpf: string;
  respImplConselho: string;
  respImplArt: string;
  respImplEmpresa: string;
  respImplEndereco: string;
  respImplTelefone: string;
  respImplEmail: string;

  caracterizacao: CaracterizacaoRow[];
  reutilizacao: ReutilizacaoRow[];
  acondicionamento: AcondicionamentoRow[];
  transporte: TransporteRow[];
  transportesQuantidades: { solo: string; excetoSolo: string; b: string; c: string; d: string };
  destinacao: DestinacaoRow[];

  assinaturaCidade: string;
  assinaturaDia: string;
  assinaturaMes: string;
  assinaturaAno: string;
}

export interface CaracterizacaoDef {
  id: string;
  label: string;
  classe: "A" | "B" | "C" | "D";
  outro?: boolean;
}

export const CARACTERIZACAO_ROWS: CaracterizacaoDef[] = [
  { id: "solo", label: "Solo (terra) Volume solto", classe: "A" },
  { id: "ceramicos", label: "Componentes cerâmicos", classe: "A" },
  { id: "premoldados", label: "Pré-moldados em concreto", classe: "A" },
  { id: "argamassa", label: "Argamassa", classe: "A" },
  { id: "asfaltico", label: "Material asfáltico", classe: "A" },
  { id: "outros_a", label: "Outros", classe: "A", outro: true },
  { id: "plasticos", label: "Plásticos", classe: "B" },
  { id: "papel", label: "Papel/papelão", classe: "B" },
  { id: "metais", label: "Metais", classe: "B" },
  { id: "vidros", label: "Vidros", classe: "B" },
  { id: "madeiras", label: "Madeiras", classe: "B" },
  { id: "gesso", label: "Gesso", classe: "B" },
  { id: "outros_b", label: "Outros", classe: "B", outro: true },
  { id: "manta", label: "Manta asfáltica", classe: "C" },
  { id: "vidro_massa", label: "Massa de vidro", classe: "C" },
  { id: "poliuretano", label: "Tubos de poliuretano", classe: "C" },
  { id: "outros_c", label: "Outros", classe: "C", outro: true },
  { id: "tintas", label: "Tintas", classe: "D" },
  { id: "solventes", label: "Solventes", classe: "D" },
  { id: "oleos", label: "Óleos", classe: "D" },
  { id: "amianto", label: "Materiais com amianto", classe: "D" },
  { id: "outros_d", label: "Outros", classe: "D", outro: true },
];

export interface ReutilizacaoDef {
  id: string;
  label: string;
  classe: "A" | "B";
  outro?: boolean;
}

export const REUTILIZACAO_ROWS: ReutilizacaoDef[] = [
  { id: "solo", label: "Solo (terra) Volume solto", classe: "A" },
  { id: "ceramicos", label: "Componentes cerâmicos", classe: "A" },
  { id: "premoldados", label: "Pré-moldados em concreto", classe: "A" },
  { id: "argamassa", label: "Argamassa", classe: "A" },
  { id: "asfaltico", label: "Material asfáltico", classe: "A" },
  { id: "outros_a", label: "Outros", classe: "A", outro: true },
  { id: "plasticos", label: "Plásticos", classe: "B" },
  { id: "papel", label: "Papel/papelão", classe: "B" },
  { id: "metais", label: "Metais", classe: "B" },
  { id: "vidros", label: "Vidros", classe: "B" },
  { id: "madeiras", label: "Madeiras", classe: "B" },
  { id: "outros_b", label: "Outros", classe: "B", outro: true },
];

export interface AcondicionamentoDef {
  id: string;
  label: string;
  classe: "A" | "B" | "C" | "D";
  outro?: boolean;
}

export const ACONDICIONAMENTO_ROWS: AcondicionamentoDef[] = [
  { id: "solo", label: "Solo (terra) Volume solto", classe: "A" },
  { id: "ceramicos", label: "Componentes cerâmicos", classe: "A" },
  { id: "premoldados", label: "Pré-moldados em concreto", classe: "A" },
  { id: "argamassa", label: "Argamassa", classe: "A" },
  { id: "asfaltico", label: "Material asfáltico", classe: "A" },
  { id: "outros_a", label: "Outros", classe: "A", outro: true },
  { id: "plasticos", label: "Plásticos", classe: "B" },
  { id: "papel", label: "Papel/papelão", classe: "B" },
  { id: "metais", label: "Metais", classe: "B" },
  { id: "vidros", label: "Vidros", classe: "B" },
  { id: "madeiras", label: "Madeiras", classe: "B" },
  { id: "gesso", label: "Gesso", classe: "B" },
  { id: "outros_b", label: "Outros", classe: "B", outro: true },
  { id: "manta", label: "Manta asfáltica", classe: "C" },
  { id: "vidro_massa", label: "Massa de vidro", classe: "C" },
  { id: "poliuretano", label: "Tubos de poliuretano", classe: "C" },
  { id: "outros_c", label: "Outros", classe: "C", outro: true },
  { id: "tintas", label: "Tintas", classe: "D" },
  { id: "solventes", label: "Solventes", classe: "D" },
  { id: "oleos", label: "Óleos", classe: "D" },
  { id: "amianto", label: "Materiais que contenham amianto", classe: "D" },
  { id: "outros_d", label: "Outros", classe: "D", outro: true },
];

export const TRANSPORTE_ROWS: { id: string; label: string }[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  label: `Empresa ${i + 1}`,
}));

export const DESTINACAO_ROWS: { id: "a" | "b" | "c" | "d"; label: string }[] = [
  { id: "a", label: "Classe A" },
  { id: "b", label: "Classe B" },
  { id: "c", label: "Classe C" },
  { id: "d", label: "Classe D (eventual)" },
];

export const emptyPgrccIatFormData = (): PgrccIatFormData => ({
  clienteRazaoSocial: "",
  clienteNomeFantasia: "",
  clienteEndereco: "",
  clienteCpfCnpj: "",
  responsavelLegal1: "",
  responsavelLegal1Cpf: "",
  responsavelLegal2: "",
  responsavelLegal2Cpf: "",
  clienteTelefone: "",
  clienteEmail: "",

  elabRazaoSocial: "",
  elabEndereco: "",
  elabCnpj: "",
  elabResponsavelLegal: "",
  elabTelefone: "",
  elabEmail: "",

  empNome: "",
  empIndicacaoFiscal: "",
  empTelefone: "",
  empEmail: "",
  empLicencaPrevia: "",
  empModalidade: "",
  empRua: "",
  empNumero: "",
  empBairro: "",
  empMunicipio: "",
  empProcessoConstrutivo: "",
  empMetragem: "",
  empInicioObra: "",
  empTerminoObra: "",

  respElabNome: "",
  respElabConselho: "",
  respElabArt: "",
  respElabEmpresa: "",
  respElabEndereco: "",
  respElabTelefone: "",
  respElabEmail: "",

  respImplNome: "",
  respImplCpf: "",
  respImplConselho: "",
  respImplArt: "",
  respImplEmpresa: "",
  respImplEndereco: "",
  respImplTelefone: "",
  respImplEmail: "",

  caracterizacao: CARACTERIZACAO_ROWS.map((r) => ({ id: r.id, demolicao: "", construcao: "", especificar: r.outro ? "" : undefined })),
  reutilizacao: REUTILIZACAO_ROWS.map((r) => ({ id: r.id, processo: "", quantidade: "", especificar: r.outro ? "" : undefined })),
  acondicionamento: ACONDICIONAMENTO_ROWS.map((r) => ({ id: r.id, forma: "", especificar: r.outro ? "" : undefined })),
  transporte: TRANSPORTE_ROWS.map((r) => ({ id: r.id, empresa: "", licenca: "" })),
  transportesQuantidades: { solo: "", excetoSolo: "", b: "", c: "", d: "" },
  destinacao: DESTINACAO_ROWS.map((r) => ({
    id: r.id,
    empresa: "",
    licenca: "",
    endereco: "",
    orgao: "",
    municipio: "",
    validade: "",
    indicacaoFiscal: "",
  })),

  assinaturaCidade: "Curitiba",
  assinaturaDia: "",
  assinaturaMes: "",
  assinaturaAno: "",
});
