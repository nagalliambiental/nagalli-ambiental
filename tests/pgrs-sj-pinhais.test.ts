import { test } from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import type { Cliente } from "@prisma/client";
import { emptyPgrsSjFormData, emptyResiduo } from "../src/lib/templates/pgrs-sj-pinhais/config";
import { buildDocxData, renderDocx } from "../src/lib/templates/pgrs-sj-pinhais/generate";

const cliente = {
  razaoSocial: "Empresa Exemplo Ltda",
  nomeFantasia: "Loja Exemplo",
  cnpj: "00.000.000/0001-00",
  ramoAtividade: "Comércio varejista",
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
  responsavelPgrsCargo: "Coordenadora",
} as unknown as Cliente;

test("checkboxes, responsáveis e data de emissão", () => {
  const form = emptyPgrsSjFormData();
  form.anexo1 = { anexado: "NAO", justificativa: "Não possui ART" };
  form.capacitacaoOferta = true;
  form.respEmpreendimentoNome = "João Silva";
  form.respTecnicoNome = "Eng. Pedro";

  const data = buildDocxData(cliente, form, null);

  assert.equal(data.anexo1_sim, "(   )");
  assert.equal(data.anexo1_nao, "(X)");
  assert.equal(data.anexo1_justificativa, "Não possui ART");
  assert.equal(data.anexo2_sim, "(X)");

  assert.equal(data.treinamento_sim, "(X)");
  assert.equal(data.treinamento_nao, "(   )");
  assert.equal(data.refeitorio_sim, "(X)");
  assert.equal(data.preparo_local, "(X)");
  assert.equal(data.preparo_terceirizado, "(   )");

  assert.equal(data.respEmpreendimentoNome, "João Silva");
  assert.equal(data.respImplantacaoNome, "Maria Souza");
  assert.equal(data.respImplantacaoCargo, "Coordenadora");
  assert.equal(data.respTecnicoNome, "Eng. Pedro");

  assert.equal(data.razao_social, "Empresa Exemplo Ltda");
  assert.equal(data.endereco_rua, "Rua das Flores");
  assert.equal(data.telefone, "(41) 3333-4444");

  assert.match(data.data_emissao, /^\d{1,2} de .+ de \d{4}$/);
});

test("gera_sim só quando há resíduo preenchido", () => {
  const form = emptyPgrsSjFormData();
  assert.equal(buildDocxData(cliente, form, null).perigosos_gera_sim, "(   )");
  assert.equal(buildDocxData(cliente, form, null).perigosos_gera_nao, "(X)");

  form.residuosPerigosos = [{ ...emptyResiduo(), residuosGerados: "Óleo queimado" }];
  const data = buildDocxData(cliente, form, null);
  assert.equal(data.perigosos_gera_sim, "(X)");
  assert.equal(data.perigosos_gera_nao, "(   )");
  assert.equal(data.naoreciclaveis_gera_nao, "(X)");
  assert.equal(data.reciclaveis_gera_nao, "(X)");
});

test("render completo do template sem erros e sem tags sobrando", () => {
  const form = emptyPgrsSjFormData();
  form.residuosReciclaveis = [
    { ...emptyResiduo(), residuosGerados: "Papelão", quantificacao: "10 kg/mês" },
  ];
  form.empresasContratadas[0] = {
    nomeFantasia: "Recicla Tudo",
    razaoSocial: "Recicla Tudo Ltda",
    cnpj: "11.222.333/0001-44",
    numeroDataValidadeLicenca: "123/2025 - 31/12/2026",
  };
  form.cronograma[0] = { acao: "Implantação da coleta seletiva", prazoInicio: "01/2026", prazoFim: "03/2026" };
  form.observacoesGerais = "Observação de teste.";
  form.capacitacaoJustificativa = "Treinamento ministrado internamente.";

  const data = buildDocxData(cliente, form, null);
  const buf = renderDocx(data as unknown as Record<string, unknown>);

  assert.ok(buf.length > 1000, "buffer vazio");

  const doc = new PizZip(buf).file("word/document.xml")!.asText();
  const tags = doc.match(/\{[a-zA-Z][^}]*\}/g) || [];
  assert.deepEqual(tags, [], `sobraram tags: ${tags.join(", ")}`);
  assert.ok(!doc.includes("FORMCHECKBOX"), "checkbox do Word sobrou no documento");
  assert.ok(doc.includes("Empresa Exemplo Ltda"));
  assert.ok(doc.includes("Observação de teste."));
  assert.ok(doc.includes("Recicla Tudo"));
  assert.ok(doc.includes("Implantação da coleta seletiva"));
  assert.ok(doc.includes("(X)"));
});
