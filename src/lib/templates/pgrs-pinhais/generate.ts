import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { Cliente, Configuracao } from "@prisma/client";
import { PgrsPinhaisFormData } from "./config";

function checkboxLine(condition: boolean, simLabel: string, naoLabel: string) {
  const sim = condition ? "(X)" : "(   )";
  const nao = condition ? "(   )" : "(X)";
  return `${sim} ${simLabel}   ${nao} ${naoLabel}`;
}

export function buildDocxData(
  empresa: Cliente,
  form: PgrsPinhaisFormData,
  configuracao: Configuracao | null
) {
  return {
    razao_social: empresa.razaoSocial || "",
    nome_fantasia: empresa.nomeFantasia || "",
    cnpj: empresa.cnpj || "",
    ramo_atividade: empresa.ramoAtividade || "",
    endereco_rua: empresa.rua || "",
    endereco_numero: empresa.numero || "",
    endereco_complemento: empresa.complemento || "",
    bairro: empresa.bairro || "",
    indicacao_fiscal: empresa.indicacaoFiscal || "",
    telefone: empresa.telefone || "",
    email: empresa.email || "",
    dias_funcionamento: empresa.diasFuncionamento || "",
    horarios_funcionamento: empresa.horariosFuncionamento || "",
    area_construida: empresa.areaConstruida || "",
    porte_colaboradores: empresa.porteColaboradores || "",
    refeitorio_texto:
      "POSSUI REFEITÓRIO NA EMPRESA?\n" +
      checkboxLine(!!empresa.possuiRefeitorio, "SIM", "NÃO"),
    refeicoes_diarias: empresa.refeicoesDiarias || "",
    unidades_dia: empresa.unidadesDia || "",
    preparo_refeicoes_texto: checkboxLine(
      empresa.preparoRefeicoes === "NO_LOCAL",
      "NO LOCAL",
      "TERCEIRIZADO"
    ),
    responsavel_tecnico_nome: empresa.responsavelTecnicoNome || "",
    responsavel_tecnico_conselho: empresa.responsavelTecnicoConselho || "",
    responsavel_tecnico_cpf: empresa.responsavelTecnicoCpf || "",
    responsavel_pgrs_nome: empresa.responsavelPgrsNome || "",
    responsavel_pgrs_cargo: empresa.responsavelPgrsCargo || "",

    responsavel_elaboracao_nome: configuracao?.responsavelNome || "",
    responsavel_elaboracao_cpf: configuracao?.responsavelCpf || "",
    responsavel_elaboracao_endereco: configuracao?.responsavelEndereco || "",
    responsavel_elaboracao_bairro: configuracao?.responsavelBairro || "",
    responsavel_elaboracao_email: configuracao?.responsavelEmail || "",
    responsavel_elaboracao_telefone: configuracao?.responsavelTelefone || "",

    perigosos: form.residuosPerigosos,
    naoReciclaveis: form.residuosNaoReciclaveis,
    reciclaveis: form.residuosReciclaveis,
    empresasContratadas: form.empresasContratadas,

    observacoes_gerais: form.observacoesGerais || "",

    responsavel_assinatura_nome: form.responsavelAssinaturaNome || "",
    responsavel_assinatura_cargo: form.responsavelAssinaturaCargo || "",

    anexo1_anexado: form.anexo1.anexado === "SIM" ? "SIM" : "NÃO",
    anexo1_justificativa: form.anexo1.justificativa || "",
    anexo2_anexado: form.anexo2.anexado === "SIM" ? "SIM" : "NÃO",
    anexo2_justificativa: form.anexo2.justificativa || "",
    anexo3_anexado: form.anexo3.anexado === "SIM" ? "SIM" : "NÃO",
    anexo3_justificativa: form.anexo3.justificativa || "",
    anexo4_anexado: form.anexo4.anexado === "SIM" ? "SIM" : "NÃO",
    anexo4_justificativa: form.anexo4.justificativa || "",
  };
}

export function renderDocx(data: Record<string, unknown>): Buffer {
  const templatePath = path.join(process.cwd(), "src/lib/templates/pgrs-pinhais/template.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" });
}
