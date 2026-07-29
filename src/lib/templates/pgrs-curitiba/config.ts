export {
  type ResiduoInput,
  type EmpresaContratadaInput,
  emptyResiduo,
  emptyEmpresaContratada,
} from "../pgrs-pinhais/config";

import { ResiduoInput, EmpresaContratadaInput, emptyResiduo, emptyEmpresaContratada } from "../pgrs-pinhais/config";

export const PGRS_CURITIBA_SLUG = "pgrs-curitiba";

export interface CronogramaItem {
  acao: string;
  prazoInicio: string;
  prazoFim: string;
}

export const emptyCronogramaItem = (): CronogramaItem => ({
  acao: "",
  prazoInicio: "",
  prazoFim: "",
});

export interface AnexoCuritibaInput {
  anexado: "SIM" | "NAO";
  justificativa?: string;
}

export const ANEXO_CURITIBA_LABELS: Record<string, string> = {
  anexo1: "Anotação de Responsabilidade Técnica pela elaboração do PGRS - ART",
  anexo2: "Fotos dos locais de acondicionamento e armazenamento de resíduos e croqui, se necessário",
  anexo3: "Contratos com as empresas terceirizadas",
  anexo4: "Comprovantes recentes de coleta e destinação final",
  anexo5: "Licenças de Operação ou Autorizações Ambientais das empresas terceirizadas",
  anexo6: "Comprovante de treinamento de pessoal e capacitação para segregação dos resíduos na empresa",
};

export interface PgrsCuritibaFormData {
  residuosPerigosos: ResiduoInput[];
  residuosNaoReciclaveis: ResiduoInput[];
  residuosReciclaveis: ResiduoInput[];
  empresasContratadas: EmpresaContratadaInput[];

  capacitacaoOferta: boolean;
  capacitacaoFrequencia: string;
  capacitacaoNFuncionarios: string;
  capacitacaoResponsavel: string;
  capacitacaoConselhoRegistro: string;
  capacitacaoConteudos: string;

  cronograma: CronogramaItem[];

  observacoesGerais: string;

  anexo1: AnexoCuritibaInput;
  anexo2: AnexoCuritibaInput;
  anexo3: AnexoCuritibaInput;
  anexo4: AnexoCuritibaInput;
  anexo5: AnexoCuritibaInput;
  anexo6: AnexoCuritibaInput;
}

export const emptyPgrsCuritibaFormData = (): PgrsCuritibaFormData => ({
  residuosPerigosos: [emptyResiduo()],
  residuosNaoReciclaveis: [emptyResiduo()],
  residuosReciclaveis: [emptyResiduo()],
  empresasContratadas: [emptyEmpresaContratada()],
  capacitacaoOferta: false,
  capacitacaoFrequencia: "",
  capacitacaoNFuncionarios: "",
  capacitacaoResponsavel: "",
  capacitacaoConselhoRegistro: "",
  capacitacaoConteudos: "",
  cronograma: [emptyCronogramaItem()],
  observacoesGerais: "",
  anexo1: { anexado: "SIM", justificativa: "" },
  anexo2: { anexado: "SIM", justificativa: "" },
  anexo3: { anexado: "SIM", justificativa: "" },
  anexo4: { anexado: "SIM", justificativa: "" },
  anexo5: { anexado: "SIM", justificativa: "" },
  anexo6: { anexado: "SIM", justificativa: "" },
});
