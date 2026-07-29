import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Cliente, Configuracao } from "@prisma/client";
import { PgrsCuritibaFormData } from "./config";

function checkboxLine(condition: boolean, simLabel: string, naoLabel: string) {
  const sim = condition ? "(X)" : "(   )";
  const nao = condition ? "(   )" : "(X)";
  return `${sim} ${simLabel}  ${nao} ${naoLabel}`;
}

export function buildDocxData(
  empresa: Cliente,
  form: PgrsCuritibaFormData,
  configuracao: Configuracao | null
) {
  const enderecoCompleto = [
    empresa.rua,
    empresa.numero && `nº ${empresa.numero}`,
    empresa.complemento,
    empresa.bairro,
    empresa.municipio,
    empresa.uf,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    razao_social: empresa.razaoSocial || "",
    nome_fantasia: empresa.nomeFantasia || "",
    cnpj: empresa.cnpj || "",
    ramo_atividade: empresa.ramoAtividade || "",
    endereco_completo: enderecoCompleto,
    indicacao_fiscal: empresa.indicacaoFiscal || "",
    telefone: empresa.telefone || "",
    dias_funcionamento: empresa.diasFuncionamento || "",
    porte_colaboradores: empresa.porteColaboradores || "",
    horarios_funcionamento: empresa.horariosFuncionamento || "",
    area_construida: empresa.areaConstruida || "",
    dirigente_nome: empresa.dirigenteNome || "",
    dirigente_cargo: empresa.dirigenteCargo || "",
    responsavel_pgrs_nome: empresa.responsavelPgrsNome || "",
    responsavel_pgrs_cargo: empresa.responsavelPgrsCargo || "",
    refeitorio_texto: checkboxLine(!!empresa.possuiRefeitorio, "SIM", "NÃO"),
    refeicoes_diarias: empresa.refeicoesDiarias || "",
    unidades_dia: empresa.unidadesDia || "",
    preparo_refeicoes_texto: checkboxLine(
      empresa.preparoRefeicoes === "NO_LOCAL",
      "No local",
      "Terceirizado"
    ),

    responsavel_elaboracao_nome: configuracao?.responsavelNome || "",
    responsavel_elaboracao_registro: configuracao?.registroCrq || "",
    responsavel_elaboracao_empresa_nome: configuracao?.nomeEmpresa || "",
    responsavel_elaboracao_empresa_cnpj: configuracao?.cnpj || "",
    responsavel_elaboracao_endereco: configuracao?.responsavelEndereco || "",
    responsavel_elaboracao_telefone: configuracao?.responsavelTelefone || "",

    perigosos_gera_texto: checkboxLine(form.residuosPerigosos.length > 0, "Sim", "Não"),
    perigosos: form.residuosPerigosos,
    naoReciclaveis_gera_texto: checkboxLine(form.residuosNaoReciclaveis.length > 0, "Sim", "Não"),
    naoReciclaveis: form.residuosNaoReciclaveis,
    reciclaveis_gera_texto: checkboxLine(form.residuosReciclaveis.length > 0, "Sim", "Não"),
    reciclaveis: form.residuosReciclaveis,

    empresasContratadas: form.empresasContratadas,

    capacitacao_oferta_texto: checkboxLine(form.capacitacaoOferta, "SIM", "NÃO"),
    capacitacao_frequencia: form.capacitacaoFrequencia || "",
    capacitacao_n_funcionarios: form.capacitacaoNFuncionarios || "",
    capacitacao_responsavel: form.capacitacaoResponsavel || "",
    capacitacao_conselho_registro: form.capacitacaoConselhoRegistro || "",
    capacitacao_conteudos: form.capacitacaoConteudos || "",

    cronograma: form.cronograma,

    observacoes_gerais: form.observacoesGerais || "",

    responsavel_empreendimento_nome: empresa.dirigenteNome || "",
    responsavel_empreendimento_cargo: empresa.dirigenteCargo || "",
    responsavel_implantacao_nome: empresa.responsavelPgrsNome || "",
    responsavel_implantacao_cargo: empresa.responsavelPgrsCargo || "",
    responsavel_elaboracao_assinatura_nome: configuracao?.responsavelNome || "",
    responsavel_elaboracao_assinatura_cargo: "Responsável Técnico",

    anexo1_anexado: form.anexo1.anexado === "SIM" ? "SIM" : "NÃO",
    anexo1_justificativa: form.anexo1.justificativa || "",
    anexo2_anexado: form.anexo2.anexado === "SIM" ? "SIM" : "NÃO",
    anexo2_justificativa: form.anexo2.justificativa || "",
    anexo3_anexado: form.anexo3.anexado === "SIM" ? "SIM" : "NÃO",
    anexo3_justificativa: form.anexo3.justificativa || "",
    anexo4_anexado: form.anexo4.anexado === "SIM" ? "SIM" : "NÃO",
    anexo4_justificativa: form.anexo4.justificativa || "",
    anexo5_anexado: form.anexo5.anexado === "SIM" ? "SIM" : "NÃO",
    anexo5_justificativa: form.anexo5.justificativa || "",
    anexo6_anexado: form.anexo6.anexado === "SIM" ? "SIM" : "NÃO",
    anexo6_justificativa: form.anexo6.justificativa || "",
  };
}

export function renderDocx(data: Record<string, unknown>): Buffer {
  const templatePath = path.join(process.cwd(), "src/lib/templates/pgrs-curitiba/template.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}
