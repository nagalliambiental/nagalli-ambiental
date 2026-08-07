import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFields } from "../src/lib/extract-license";

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
