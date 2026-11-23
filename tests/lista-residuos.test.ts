import { test } from "node:test";
import assert from "node:assert/strict";
import { classeDeResiduos, classeDeCodigoIbama } from "../src/lib/sinir";

test("lista IBAMA/CONAMA: tijolos 170102 vira RCC Classe A", () => {
  const c = classeDeResiduos([{ residuo: { resCodigoIbama: "170102", resDescricao: "Tijolos" } }]);
  assert.equal(c.classificacaoNome, "RCC Classe A");
  assert.equal(c.classificacaoOrigem, "IBAMA/CONAMA 307");
});

test("lista IBAMA/CONAMA: 170301(*) misturas betuminosas vira Classe I — Perigoso", () => {
  const c = classeDeResiduos([{ residuo: { resCodigoIbama: "170301(*)", resDescricao: "Misturas betuminosas contendo alcatrão" } }]);
  assert.equal(c.letra, "D");
  assert.equal(c.classificacaoNome, "Classe I — Perigoso");
});

test("lista IBAMA/CONAMA: 160604 pilhas alcalinas (D sem *) vira RCC Classe D", () => {
  const c = classeDeResiduos([{ residuo: { resCodigoIbama: "160604", resDescricao: "Pilhas alcalinas" } }]);
  assert.equal(c.letra, "D");
  assert.equal(c.classificacaoNome, "RCC Classe D");
});

test("lista IBAMA/CONAMA: 200121 lâmpadas fluorescentes vira Classe I — Perigoso", () => {
  const c = classeDeResiduos([{ residuo: { resCodigoIbama: "200121(*)", resDescricao: "Lâmpadas fluorescentes" } }]);
  assert.equal(c.classificacaoNome, "Classe I — Perigoso");
});

test("código fora da lista com (*) cai no fallback e vira Classe I — Perigoso", () => {
  const c = classeDeResiduos([{ classe: { claCodigo: 1, claDescricao: "CLASSE I" }, residuo: { resCodigoIbama: "160303(*)", resDescricao: "Resíduos inorgânicos contendo substâncias perigosas" } }]);
  assert.equal(c.letra, "D");
  assert.equal(c.classificacaoNome, "Classe I — Perigoso");
});

test("classeDeCodigoIbama usa a lista antes das regex", () => {
  const c = classeDeCodigoIbama("170504", "Solos e rochas");
  assert.equal(c.classificacaoNome, "RCC Classe A (Solo)");
  assert.equal(c.classificacaoOrigem, "IBAMA/CONAMA 307");
});

test("classeDeCodigoIbama: código fora da lista sem sinal vira Não identificado", () => {
  const c = classeDeCodigoIbama("999999", "Qualquer resíduo");
  assert.equal(c.classificacaoNome, "Não identificado");
  assert.equal(c.classificacaoOrigem, "fora_da_lista_ibama");
});

test("classeDeResiduos: classe na descrição oficial fora da lista é respeitada", () => {
  const c = classeDeResiduos([{ residuo: { resCodigoIbama: "999998", resDescricao: "Resíduo qualquer (Classe B conforme Resolução CONAMA 307/02)" } }]);
  assert.equal(c.classificacaoNome, "RCC Classe B");
});
