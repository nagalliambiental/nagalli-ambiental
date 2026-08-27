import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarEndereco } from "../src/lib/endereco";

test("endereço omite todos os campos vazios", () => {
  assert.deepEqual(formatarEndereco({}), []);
  assert.deepEqual(
    formatarEndereco({ rua: null, numero: "", bairro: null, complemento: undefined, municipio: null, uf: "", cep: null }),
    []
  );
});

test("endereço com apenas alguns campos omite o restante", () => {
  assert.deepEqual(formatarEndereco({ rua: "Rua A" }), ["Rua A"]);
  assert.deepEqual(formatarEndereco({ municipio: "Curitiba", uf: "PR" }), ["Curitiba - PR"]);
  assert.deepEqual(formatarEndereco({ cep: "80000-000" }), ["CEP: 80000-000"]);
});

test("endereço completo segue a ordem: rua+número, complemento, bairro, cidade - UF, CEP", () => {
  const linhas = formatarEndereco({
    rua: "Rua X",
    numero: "12",
    complemento: "Bloco 2",
    bairro: "Centro",
    municipio: "Curitiba",
    uf: "PR",
    cep: "80000-000",
  });
  assert.deepEqual(linhas, ["Rua X, 12", "Bloco 2", "Centro", "Curitiba - PR", "CEP: 80000-000"]);
});

test("número 0 ou S/N não é exibido junto à rua", () => {
  assert.deepEqual(formatarEndereco({ rua: "Rua Y", numero: "0" }), ["Rua Y"]);
  assert.deepEqual(formatarEndereco({ rua: "Rua Y", numero: "S/N" }), ["Rua Y"]);
});

test("município sem UF e UF sem município ainda aparecem", () => {
  assert.deepEqual(formatarEndereco({ municipio: "Londrina" }), ["Londrina"]);
  assert.deepEqual(formatarEndereco({ uf: "PR" }), ["PR"]);
});