import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarCnpj, cnpjsIguais, encontrarConflitoCnpj } from "../src/lib/cliente-cnpj";

function dbFakeClientes(clientes: { id: number; cnpj: string; apelido: string }[]) {
  return {
    cliente: {
      findMany: async () => clientes,
    },
  };
}

test("normalizarCnpj remove tudo que não é dígito", () => {
  assert.equal(normalizarCnpj("12.345.678/0001-90"), "12345678000190");
  assert.equal(normalizarCnpj("12345678000190"), "12345678000190");
  assert.equal(normalizarCnpj("  ABC 12-34  "), "1234");
  assert.equal(normalizarCnpj(""), "");
  assert.equal(normalizarCnpj(undefined as unknown as string), "");
});

test("cnpjsIguais compara desconsiderando formatação", () => {
  assert.equal(cnpjsIguais("12.345.678/0001-90", "12345678000190"), true);
  assert.equal(cnpjsIguais("12.345.678/0001-90", "12.345.678/0001-90"), true);
  assert.equal(cnpjsIguais("12.345.678/0001-90", "12.345.678/0001-91"), false);
});

test("novo cliente com CNPJ já usado por outro cliente → conflito", async () => {
  const db = dbFakeClientes([{ id: 1, cnpj: "12.345.678/0001-90", apelido: "Matriz" }]);
  const conflito = await encontrarConflitoCnpj(db, "12345678000190");
  assert.deepEqual(conflito, { id: 1, apelido: "Matriz" });
});

test("novo cliente com CNPJ novo → sem conflito", async () => {
  const db = dbFakeClientes([{ id: 1, cnpj: "12.345.678/0001-90", apelido: "Matriz" }]);
  assert.equal(await encontrarConflitoCnpj(db, "99.999.999/0001-99"), null);
});

test("formatos diferentes do mesmo CNPJ são considerados duplicados", async () => {
  const db = dbFakeClientes([{ id: 1, cnpj: "12.345.678/0001-90", apelido: "Matriz" }]);
  const conflito = await encontrarConflitoCnpj(db, "12345678000190");
  assert.equal(conflito?.id, 1);
});

test("edição mantendo o próprio CNPJ é permitida", async () => {
  const db = dbFakeClientes([{ id: 1, cnpj: "12.345.678/0001-90", apelido: "Matriz" }]);
  assert.equal(await encontrarConflitoCnpj(db, "12.345.678/0001-90", 1), null);
});

test("edição tentando assumir CNPJ de outro cliente é impedida", async () => {
  const db = dbFakeClientes([
    { id: 1, cnpj: "12.345.678/0001-90", apelido: "Matriz" },
    { id: 2, cnpj: "98.765.432/0001-90", apelido: "Filial" },
  ]);
  const conflito = await encontrarConflitoCnpj(db, "12.345.678/0001-90", 2);
  assert.deepEqual(conflito, { id: 1, apelido: "Matriz" });
});

test("CNPJ vazio não gera conflito", async () => {
  const db = dbFakeClientes([{ id: 1, cnpj: "12.345.678/0001-90", apelido: "Matriz" }]);
  assert.equal(await encontrarConflitoCnpj(db, ""), null);
});