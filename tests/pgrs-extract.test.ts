import test from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import type { Cliente } from "@prisma/client";

import { extrairPgrsDoTexto } from "../src/lib/pgrs-extract";
import { emptyPgrsSjFormData, emptyResiduo } from "../src/lib/templates/pgrs-sj-pinhais/config";
import { buildDocxData as buildSj, renderDocx as renderSj } from "../src/lib/templates/pgrs-sj-pinhais/generate";
import { emptyPgrsCuritibaFormData } from "../src/lib/templates/pgrs-curitiba/config";
import { buildDocxData as buildCur, renderDocx as renderCur } from "../src/lib/templates/pgrs-curitiba/generate";
import { emptyPgrsFormData } from "../src/lib/templates/pgrs-pinhais/config";
import { buildDocxData as buildPin, renderDocx as renderPin } from "../src/lib/templates/pgrs-pinhais/generate";

const cliente = {
  razaoSocial: "Empresa Exemplo Ltda",
  nomeFantasia: "Loja Exemplo",
  cnpj: "00.000.000/0001-00",
  ramoAtividade: "Comércio varejista de materiais de construção",
  rua: "Rua das Flores",
  numero: "123",
  bairro: "Centro",
  indicacaoFiscal: "12345",
  diasFuncionamento: "Seg a Sáb",
  horariosFuncionamento: "08:00 às 18:00",
  porteColaboradores: "15",
  telefone: "(41) 3333-4444",
  refeicoesDiarias: "20",
  possuiRefeitorio: true,
  preparoRefeicoes: "NO_LOCAL",
  respLegal: "João Silva",
  responsavelPgrsNome: "Maria Souza",
  responsavelPgrsCargo: "Coordenadora Ambiental",
  responsavelTecnicoNome: "Eng. Pedro Alvarez",
  responsavelTecnicoConselho: "CREA 12345",
} as unknown as Cliente;

function textoDe(docx: Buffer): string {
  const docXml = new PizZip(docx).file("word/document.xml")?.asText() || "";
  return docXml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PERIGOSO = { pontoGeracao: "Manutenção", residuosGerados: "Óleo queimado", quantificacao: "5 L/mês", acondicionamento: "Bidão", armazenamento: "Galpão", coletaInterna: "Cesto identificado", empresaTransporte: "EcoTrans", empresaDisposicaoFinal: "Aterro Paranaense" };
const NAO_RECICLAVEL = { pontoGeracao: "Copiadora", residuosGerados: "Toner", quantificacao: "2 un/mês", acondicionamento: "Caixa", armazenamento: "Depósito", coletaInterna: "", empresaTransporte: "EcoTrans", empresaDisposicaoFinal: "Aterro Paranaense" };
const RECICLAVEL = { pontoGeracao: "Refeitório", residuosGerados: "Papelão", quantificacao: "10 kg/mês", acondicionamento: "Fardos", armazenamento: "Pátio", coletaInterna: "Contêiner", empresaTransporte: "Verde Certa", empresaDisposicaoFinal: "Ecoponto" };
const EMPRESA = { nomeFantasia: "Verde Certa", razaoSocial: "Verde Certa Limpeza Ltda", cnpj: "11.222.333/0001-44", numeroDataValidadeLicenca: "123/2025 - 31/12/2026" };
const OBS = "Empresa realiza coleta seletiva desde 2024.";
const CRONOGRAMA = [{ acao: "Implantação da coleta seletiva", prazoInicio: "01/2026", prazoFim: "03/2026" }];

const sjForm = emptyPgrsSjFormData();
sjForm.residuosPerigosos = [{ ...emptyResiduo(), ...PERIGOSO }];
sjForm.residuosNaoReciclaveis = [{ ...emptyResiduo(), ...NAO_RECICLAVEL }];
sjForm.residuosReciclaveis = [{ ...emptyResiduo(), ...RECICLAVEL }];
sjForm.empresasContratadas = [EMPRESA];
sjForm.capacitacaoOferta = true;
sjForm.capacitacaoFrequencia = "Semestral";
sjForm.capacitacaoNFuncionarios = "12";
sjForm.capacitacaoResponsavel = "Maria Souza";
sjForm.capacitacaoConselhoRegistro = "000000/AMB";
sjForm.capacitacaoConteudos = "Segregação em 3 cores; descarte de pilhas e eletrônicos.";
sjForm.cronograma = CRONOGRAMA;
sjForm.observacoesGerais = OBS;
sjForm.anexo1 = { anexado: "NAO", justificativa: "ART em elaboração" };
sjForm.anexo2 = { anexado: "SIM" };
sjForm.respEmpreendimentoNome = "João Silva";
sjForm.respEmpreendimentoCargo = "Diretor";
sjForm.respImplantacaoNome = "Maria Souza";
sjForm.respImplantacaoCargo = "Coordenadora Ambiental";
sjForm.respTecnicoNome = "Eng. Pedro Alvarez";
sjForm.respTecnicoCargo = "Eng. de Segurança";

const curForm = emptyPgrsCuritibaFormData();
curForm.residuosPerigosos = sjForm.residuosPerigosos;
curForm.residuosNaoReciclaveis = sjForm.residuosNaoReciclaveis;
curForm.residuosReciclaveis = sjForm.residuosReciclaveis;
curForm.empresasContratadas = sjForm.empresasContratadas;
curForm.capacitacaoOferta = true;
curForm.capacitacaoFrequencia = "Semestral";
curForm.capacitacaoNFuncionarios = "12";
curForm.capacitacaoResponsavel = "Maria Souza";
curForm.capacitacaoConselhoRegistro = "000000/AMB";
curForm.capacitacaoConteudos = "Segregação em 3 cores.";
curForm.cronograma = CRONOGRAMA;
curForm.observacoesGerais = OBS;
curForm.anexo1 = { anexado: "NAO", justificativa: "ART em elaboração" };

const pinForm = emptyPgrsFormData();
pinForm.residuosPerigosos = sjForm.residuosPerigosos;
pinForm.residuosNaoReciclaveis = sjForm.residuosNaoReciclaveis;
pinForm.residuosReciclaveis = sjForm.residuosReciclaveis;
pinForm.empresasContratadas = sjForm.empresasContratadas;
pinForm.observacoesGerais = OBS;
pinForm.anexo1 = { anexado: "NAO", justificativa: "ART em elaboração" };
pinForm.responsavelAssinaturaNome = "João Silva";
pinForm.responsavelAssinaturaCargo = "Diretor";

const textoSj = textoDe(renderSj(buildSj(cliente, sjForm, null)));
const textoCur = textoDe(renderCur(buildCur(cliente, curForm, null)));
const textoPin = textoDe(renderPin(buildPin(cliente, pinForm, null)));

function checarEstabelecimento(estab: Record<string, unknown>) {
  assert.equal(estab.ramoAtividade, "Comércio varejista de materiais de construção");
  assert.equal(estab.diasFuncionamento, "Seg a Sáb");
  assert.equal(estab.horariosFuncionamento, "08:00 às 18:00");
  assert.equal(estab.porteColaboradores, "15");
  assert.equal(estab.possuiRefeitorio, true);
  assert.equal(estab.refeicoesDiarias, "20");
  assert.equal(estab.preparoRefeicoes, "NO_LOCAL");
}

function checarResiduosEMpresas(form: Record<string, unknown>) {
  assert.deepEqual(form.residuosPerigosos, [PERIGOSO]);
  assert.deepEqual(form.residuosNaoReciclaveis, [NAO_RECICLAVEL]);
  assert.deepEqual(form.residuosReciclaveis, [RECICLAVEL]);
  assert.deepEqual(form.empresasContratadas, [EMPRESA]);
}

test("extrai PGRS São José dos Pinhais", () => {
  const { formPatch, estabPatch } = extrairPgrsDoTexto(textoSj);

  assert.equal(formPatch.respEmpreendimentoNome, "João Silva");
  assert.equal(formPatch.respEmpreendimentoCargo, "Diretor");
  assert.equal(formPatch.respImplantacaoNome, "Maria Souza");
  assert.equal(formPatch.respImplantacaoCargo, "Coordenadora Ambiental");
  assert.equal(formPatch.respTecnicoNome, "Eng. Pedro Alvarez");
  assert.equal(formPatch.respTecnicoCargo, "Eng. de Segurança");

  assert.deepEqual(formPatch.anexo1, { anexado: "NAO", justificativa: "ART em elaboração" });
  assert.deepEqual(formPatch.anexo2, { anexado: "SIM", justificativa: "" });
  assert.deepEqual(formPatch.anexo6, { anexado: "SIM", justificativa: "" });

  assert.equal(formPatch.capacitacaoOferta, true);
  assert.equal(formPatch.capacitacaoFrequencia, "Semestral");
  assert.equal(formPatch.capacitacaoNFuncionarios, "12");
  assert.equal(formPatch.capacitacaoResponsavel, "Maria Souza");
  assert.equal(formPatch.capacitacaoConselhoRegistro, "000000/AMB");
  assert.equal(formPatch.capacitacaoConteudos, "Segregação em 3 cores; descarte de pilhas e eletrônicos.");
  assert.equal(formPatch.capacitacaoJustificativa, "");

  assert.deepEqual(formPatch.cronograma, CRONOGRAMA);
  assert.equal(formPatch.observacoesGerais, OBS);
  checarResiduosEMpresas(formPatch);
  checarEstabelecimento(estabPatch);
});

test("extrai PGRS Curitiba", () => {
  const { formPatch, estabPatch } = extrairPgrsDoTexto(textoCur);

  assert.equal(formPatch.capacitacaoOferta, true);
  assert.equal(formPatch.capacitacaoFrequencia, "Semestral");
  assert.equal(formPatch.capacitacaoNFuncionarios, "12");
  assert.equal(formPatch.capacitacaoResponsavel, "Maria Souza");
  assert.equal(formPatch.capacitacaoConselhoRegistro, "000000/AMB");
  assert.equal(formPatch.capacitacaoConteudos, "Segregação em 3 cores.");
  assert.ok(!("capacitacaoJustificativa" in formPatch));

  assert.deepEqual(formPatch.cronograma, CRONOGRAMA);
  assert.equal(formPatch.observacoesGerais, OBS);

  assert.deepEqual(formPatch.anexo1, { anexado: "NAO", justificativa: "ART em elaboração" });
  assert.deepEqual(formPatch.anexo3, { anexado: "SIM", justificativa: "" });
  assert.deepEqual(formPatch.anexo6, { anexado: "SIM", justificativa: "" });

  assert.equal(formPatch.respImplantacaoNome, "Maria Souza");
  assert.equal(formPatch.respImplantacaoCargo, "Coordenadora Ambiental");

  checarResiduosEMpresas(formPatch);
  checarEstabelecimento(estabPatch);
  assert.ok(!("areaConstruida" in estabPatch));
  assert.ok(!("responsavelAssinaturaNome" in formPatch));
});

test("extrai PGRS Pinhais", () => {
  const { formPatch, estabPatch } = extrairPgrsDoTexto(textoPin);

  assert.equal(formPatch.responsavelAssinaturaNome, "João Silva");
  assert.equal(formPatch.responsavelAssinaturaCargo, "Diretor");

  assert.deepEqual(formPatch.anexo1, { anexado: "NAO", justificativa: "ART em elaboração" });
  assert.deepEqual(formPatch.anexo4, { anexado: "SIM", justificativa: "" });
  assert.ok(!("anexo5" in formPatch));

  assert.equal(formPatch.observacoesGerais, OBS);
  assert.ok(!("capacitacaoOferta" in formPatch));
  assert.ok(!("cronograma" in formPatch));

  checarResiduosEMpresas(formPatch);
  checarEstabelecimento(estabPatch);
});
