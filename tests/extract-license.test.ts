import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFields, dividirTextoEmItens } from "../src/lib/extract-license";

test("extractFields extrai validade, número da licença e protocolo", () => {
  const texto = [
    "SECRETARIA DO MEIO AMBIENTE",
    "LICENÇA DE OPERAÇÃO Nº 12345",
    "Processo nº 09.2023.0001234",
    "Validade: 15/12/2026",
    "4. CONDICIONANTES",
    "1. Manter o sistema de tratamento em operação.",
    "2. Apresentar relatório semestral.",
    "Página 1/2",
  ].join("\n");

  const r = extractFields(texto);
  assert.equal(r.validade, "2026-12-15");
  assert.equal(r.numLicenca, "12345");
  assert.equal(r.numProtocolo, "09.2023.0001234");
  assert.ok(r.condicionantes?.includes("Manter o sistema de tratamento"));
});

test("extractFields ignora datas inválidas", () => {
  const texto = "Qualquer texto sem datas 99/99/9999";
  const r = extractFields(texto);
  assert.equal(r.validade, null);
});

test("extractFields não confunde protocolo com licença", () => {
  const texto = "LICENÇA PRÉVIA 555 - Protocolo nº 777.2023";
  const r = extractFields(texto);
  assert.equal(r.numLicenca, "555");
  assert.equal(r.numProtocolo, "777.2023");
});

test("extractFields retorna null quando não há condicionantes", () => {
  const texto = "Documento sem seção de condicionantes";
  const r = extractFields(texto);
  assert.equal(r.condicionantes, null);
});

test("dividirTextoEmItens junta linhas que terminam com ':'", () => {
  const texto = [
    "1. Condicionante importante:",
    "deverá apresentar relatório.",
    "2. Outra condicionante.",
  ].join("\n");
  const itens = dividirTextoEmItens(texto);
  assert.equal(itens.length, 2);
  assert.ok(itens[0].descricao.includes("deverá apresentar relatório"));
});

test("dividirTextoEmItens junta linhas que começam com minúscula", () => {
  const texto = [
    "1. Deverá ser apresentado relatório",
    "de automonitoramento anual ao órgão.",
    "2. Manter sistema de tratamento.",
  ].join("\n");
  const itens = dividirTextoEmItens(texto);
  assert.equal(itens.length, 2);
  assert.ok(itens[0].descricao.includes("de automonitoramento"));
});

test("dividirTextoEmItens junta fragmentos com 'bem como'", () => {
  const texto = [
    "1. Apresentar plano de gerenciamento",
    "bem como o cronograma de implantação.",
    "2. Outra exigência.",
  ].join("\n");
  const itens = dividirTextoEmItens(texto);
  assert.equal(itens.length, 2);
  assert.ok(itens[0].descricao.includes("bem como o cronograma"));
});

test("dividirTextoEmItens remove dados do empreendimento como itens isolados", () => {
  const texto = [
    "1. Deverá ser apresentado plano.",
    "Central Geradora Hidrelétrica - CGH I",
    "2. Outra condicionante válida.",
    "Rio Paraná, Bacia Paraná",
    "Barramento: concreto, 83m",
    "Nível Normal de Montante: 728m",
    "Potência: 1,00 MW",
    "3. Terceira condicionante.",
  ].join("\n");
  const itens = dividirTextoEmItens(texto);
  assert.equal(itens.length, 3);
  assert.ok(!itens.some(i => i.titulo === "Central Geradora Hidrelétrica - CGH I"));
  assert.ok(!itens.some(i => i.titulo === "Rio Paraná, Bacia Paraná"));
});

test("dividirTextoEmItens preserva condicionantes legítimas", () => {
  const texto = [
    "1. Deverá apresentar relatório de automonitoramento",
    "após 6 meses da instalação.",
    "2. Fica proibida a queima a céu aberto",
    "de qualquer tipo de material.",
    "3. A renovação da licença deverá ser",
    "requerida com 120 dias de antecedência.",
  ].join("\n");
  const itens = dividirTextoEmItens(texto);
  assert.equal(itens.length, 3);
});
