import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarAdicionais, nomesAdicionais } from "../src/lib/tarefas-responsaveis";

test("remove principal, duplicados e inválidos", () => {
  assert.deepEqual(normalizarAdicionais(3, [3, 5, 5, "7", 0, -1, null, "x"]), [5, 7]);
});

test("entrada não-array vira lista vazia", () => {
  assert.deepEqual(normalizarAdicionais(1, undefined), []);
  assert.deepEqual(normalizarAdicionais(1, "2"), []);
});

test("nomesAdicionais extrai nomes", () => {
  assert.deepEqual(
    nomesAdicionais([{ responsavel: { nome: "Ana" } }, { responsavel: { nome: "Beto" } }]),
    ["Ana", "Beto"]
  );
  assert.deepEqual(nomesAdicionais(null), []);
});
