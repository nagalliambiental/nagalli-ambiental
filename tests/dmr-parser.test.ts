import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  parseDmrSheet,
  getTrimestreAtual,
  getDiasFimTrimestre,
  getDmrStatusField,
  isDmrPendente,
} from "../src/lib/dmr-parser";

function montarWorkbook() {
  const linhas = [
    ["", "EMPRESA", "IDENTIFICACAO", "UNIDADE", "RESPONSAVEL", "DMR 1T", "", "2T", "2024", "", "", "", "4T"],
    ["", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["", "EcoResíduos", "LP 123", "Unidade A", "João", "OK", "OK", "OK", "OK", "123456", "654321", "OK", "OK"],
    ["", "", "LP 456", "Unidade B", "Maria", "", "", "PENDENTE", "", "", "", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DMR");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf as ArrayBuffer;
}

test("parseDmrSheet extrai ano do cabeçalho", () => {
  const { ano } = parseDmrSheet(montarWorkbook());
  assert.equal(ano, 2024);
});

test("parseDmrSheet herda empresa quando célula vazia e pula linhas sem identificação", () => {
  const { linhas } = parseDmrSheet(montarWorkbook());
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].empresa, "EcoResíduos");
  assert.equal(linhas[0].identificacao, "LP 123");
  assert.equal(linhas[0].trimestres.length, 4);
  assert.equal(linhas[1].empresa, "EcoResíduos");
  assert.equal(linhas[1].identificacao, "LP 456");
});

test("parseDmrSheet lê valores de DMR e MTR por trimestre", () => {
  const { linhas } = parseDmrSheet(montarWorkbook());
  const primeiro = linhas[0];
  assert.equal(primeiro.trimestres[0].dmr, "OK");
  assert.equal(primeiro.trimestres[1].mtr, "654321");
});

test("getTrimestreAtual retorna trimestre válido", () => {
  const t = getTrimestreAtual();
  assert.ok(t.numero >= 1 && t.numero <= 4);
  assert.ok(t.label);
  assert.ok(t.inicio);
  assert.ok(t.fim);
});

test("getDiasFimTrimestre retorna número >= 0", () => {
  assert.ok(getDiasFimTrimestre() >= 0);
});

test("getDmrStatusField mapeia trimestre para campos", () => {
  assert.deepEqual(getDmrStatusField(1), { dmr: "t1Dmr", mtr: "t1Mtr" });
  assert.deepEqual(getDmrStatusField(4), { dmr: "t4Dmr", mtr: "t4Mtr" });
});

test("isDmrPendente identifica falta de OK", () => {
  assert.equal(isDmrPendente({ t1Dmr: "OK", t1Mtr: "OK" }, 1), false);
  assert.equal(isDmrPendente({ t1Dmr: "", t1Mtr: "OK" }, 1), true);
  assert.equal(isDmrPendente({ t1Dmr: "OK", t1Mtr: "123" }, 1), true);
});
