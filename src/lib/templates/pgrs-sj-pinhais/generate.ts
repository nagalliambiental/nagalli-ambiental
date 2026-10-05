import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Cliente, Configuracao } from "@prisma/client";
import { PgrsSjFormData, AnexoSjInput, ResiduoInput } from "./config";

function cb(condition: boolean): string {
  return condition ? "(X)" : "(   )";
}

function temResiduos(rows: ResiduoInput[]): boolean {
  return rows.some((r) => r.residuosGerados.trim());
}

function anexoSim(a: AnexoSjInput): boolean {
  return a.anexado === "SIM";
}

export function buildDocxData(
  empresa: Cliente,
  form: PgrsSjFormData,
  configuracao: Configuracao | null
) {
  const temPerigosos = temResiduos(form.residuosPerigosos);
  const temNaoReciclaveis = temResiduos(form.residuosNaoReciclaveis);
  const temReciclaveis = temResiduos(form.residuosReciclaveis);

  return {
    // identificação
    razao_social: empresa.razaoSocial || "",
    nome_fantasia: empresa.nomeFantasia || "",
    cnpj: empresa.cnpj || "",
    ramo_atividade: empresa.ramoAtividade || "",
    endereco_rua: empresa.rua || "",
    endereco_numero: empresa.numero || "",
    bairro: empresa.bairro || "",
    indicacao_fiscal: empresa.indicacaoFiscal || "",
    dias_funcionamento: empresa.diasFuncionamento || "",
    horarios_funcionamento: empresa.horariosFuncionamento || "",
    porte_colaboradores: empresa.porteColaboradores || "",
    telefone: empresa.telefone || "",
    celular: "",
    refeicoesDiarias: empresa.refeicoesDiarias || "",

    // responsáveis
    respEmpreendimentoNome:
      form.respEmpreendimentoNome || empresa.representanteLegalNome || empresa.respLegal || "",
    respEmpreendimentoCargo: form.respEmpreendimentoCargo || "",
    respImplantacaoNome: form.respImplantacaoNome || empresa.responsavelPgrsNome || "",
    respImplantacaoCargo: form.respImplantacaoCargo || empresa.responsavelPgrsCargo || "",
    respImplantacaoFixo: "",
    respImplantacaoCelular: "",

    // responsável técnico (elaboração)
    respTecnicoNome:
      form.respTecnicoNome ||
      empresa.responsavelElaboracaoNome ||
      empresa.responsavelTecnicoNome ||
      configuracao?.responsavelNome ||
      "",
    respTecnicoConselho:
      empresa.responsavelTecnicoConselho ||
      empresa.responsavelElaboracaoRegistroCrq ||
      configuracao?.registroCrq ||
      "",
    respTecnicoEmpresa:
      empresa.responsavelElaboracaoEmpresaNome || configuracao?.nomeEmpresa || "",
    respTecnicoCnpj:
      empresa.responsavelElaboracaoEmpresaCnpj || configuracao?.cnpj || "",
    respTecnicoEndereco:
      empresa.responsavelElaboracaoEndereco || configuracao?.responsavelEndereco || "",
    respTecnicoNumero: "",
    respTecnicoBairro:
      empresa.responsavelElaboracaoBairro || configuracao?.responsavelBairro || "",
    respTecnicoMunicipio: "",
    respTecnicoEmail:
      empresa.responsavelElaboracaoEmail || configuracao?.responsavelEmail || "",
    respTecnicoFixo:
      empresa.responsavelElaboracaoTelefone || configuracao?.responsavelTelefone || "",
    respTecnicoCelular: "",
    respTecnicoCargo: form.respTecnicoCargo || "",

    // checkboxes — anexos
    anexo1_sim: cb(anexoSim(form.anexo1)),
    anexo1_nao: cb(!anexoSim(form.anexo1)),
    anexo1_justificativa: form.anexo1.justificativa || "",
    anexo2_sim: cb(anexoSim(form.anexo2)),
    anexo2_nao: cb(!anexoSim(form.anexo2)),
    anexo2_justificativa: form.anexo2.justificativa || "",
    anexo3_sim: cb(anexoSim(form.anexo3)),
    anexo3_nao: cb(!anexoSim(form.anexo3)),
    anexo3_justificativa: form.anexo3.justificativa || "",
    anexo4_sim: cb(anexoSim(form.anexo4)),
    anexo4_nao: cb(!anexoSim(form.anexo4)),
    anexo4_justificativa: form.anexo4.justificativa || "",
    anexo5_sim: cb(anexoSim(form.anexo5)),
    anexo5_nao: cb(!anexoSim(form.anexo5)),
    anexo5_justificativa: form.anexo5.justificativa || "",
    anexo6_sim: cb(anexoSim(form.anexo6)),
    anexo6_nao: cb(!anexoSim(form.anexo6)),
    anexo6_justificativa: form.anexo6.justificativa || "",

    // checkboxes — demais
    refeitorio_sim: cb(!!empresa.possuiRefeitorio),
    refeitorio_nao: cb(!empresa.possuiRefeitorio),
    preparo_local: cb(empresa.preparoRefeicoes !== "TERCEIRIZADO"),
    preparo_terceirizado: cb(empresa.preparoRefeicoes === "TERCEIRIZADO"),
    perigosos_gera_sim: cb(temPerigosos),
    perigosos_gera_nao: cb(!temPerigosos),
    naoreciclaveis_gera_sim: cb(temNaoReciclaveis),
    naoreciclaveis_gera_nao: cb(!temNaoReciclaveis),
    reciclaveis_gera_sim: cb(temReciclaveis),
    reciclaveis_gera_nao: cb(!temReciclaveis),
    treinamento_sim: cb(form.capacitacaoOferta),
    treinamento_nao: cb(!form.capacitacaoOferta),

    // tabelas (loops)
    perigosos: form.residuosPerigosos,
    naoReciclaveis: form.residuosNaoReciclaveis,
    reciclaveis: form.residuosReciclaveis,
    empresasContratadas: form.empresasContratadas,
    cronograma: form.cronograma,

    // treinamento
    capacitacaoFrequencia: form.capacitacaoFrequencia || "",
    capacitacaoNFuncionarios: form.capacitacaoNFuncionarios || "",
    capacitacaoResponsavel: form.capacitacaoResponsavel || "",
    capacitacaoConselho: form.capacitacaoConselhoRegistro || "",
    capacitacaoConteudos: form.capacitacaoConteudos || "",
    capacitacaoJustificativa: form.capacitacaoJustificativa || "",

    observacoesGerais: form.observacoesGerais || "",

    data_emissao: new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()),
  };
}

export function renderDocx(data: Record<string, unknown>): Buffer {
  const templatePath = path.join(
    process.cwd(),
    "src/lib/templates/pgrs-sj-pinhais/template.docx"
  );
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}
