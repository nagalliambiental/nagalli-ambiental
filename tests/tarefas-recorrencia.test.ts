import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proximaData,
  preverProximaData,
  calcularDataLimite,
  normalizarPeriodos,
  responsavelParaData,
} from "../src/lib/tarefas-recorrencia";
import { RECORRENCIA_TAREFA } from "../src/lib/constants";

function D(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes - 1, dia, 12);
}

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

test("proximaData avança semanal e quinzenal", () => {
  assert.equal(iso(proximaData(D(2026, 1, 5), RECORRENCIA_TAREFA.SEMANAL)), "2026-01-12");
  assert.equal(iso(proximaData(D(2026, 1, 5), RECORRENCIA_TAREFA.QUINZENAL)), "2026-01-19");
});

test("proximaData mensal clampa no fim do mês", () => {
  const p = proximaData(D(2026, 1, 31), RECORRENCIA_TAREFA.MENSAL);
  assert.equal(iso(p), "2026-02-28");
});

test("proximaData anual mantém dia e mês", () => {
  const p = proximaData(D(2026, 3, 10), RECORRENCIA_TAREFA.ANUAL);
  assert.equal(iso(p), "2027-03-10");
});

test("preverProximaData mantém a data futura", () => {
  const prevista = preverProximaData(D(2026, 6, 15), RECORRENCIA_TAREFA.SEMANAL, D(2026, 6, 10));
  assert.equal(iso(prevista), "2026-06-22");
});

test("preverProximaData nunca devolve data no passado", () => {
  const prevista = preverProximaData(D(2026, 6, 1), RECORRENCIA_TAREFA.SEMANAL, D(2026, 6, 10));
  assert.equal(iso(prevista), "2026-06-17");
});

test("preverProximaData conta a partir de hoje quando cai exatamente hoje", () => {
  const prevista = preverProximaData(D(2026, 6, 3), RECORRENCIA_TAREFA.SEMANAL, D(2026, 6, 10));
  assert.equal(iso(prevista), "2026-06-17");
});

test("calcularDataLimite preserva o intervalo prazo → data limite", () => {
  const novo = calcularDataLimite(D(2026, 7, 1), D(2026, 6, 1), D(2026, 6, 11));
  assert.ok(novo);
  assert.equal(iso(novo), "2026-07-11");
});

test("calcularDataLimite preserva intervalo negativo", () => {
  const novo = calcularDataLimite(D(2026, 7, 1), D(2026, 6, 10), D(2026, 6, 8));
  assert.ok(novo);
  assert.equal(iso(novo), "2026-06-29");
});

test("calcularDataLimite devolve null sem data limite", () => {
  assert.equal(calcularDataLimite(D(2026, 7, 1), D(2026, 6, 1), null), null);
});

test("calcularDataLimite usa o novo prazo quando não há prazo final", () => {
  const novo = calcularDataLimite(D(2026, 7, 1), null, D(2026, 6, 20));
  assert.ok(novo);
  assert.equal(iso(novo), "2026-07-01");
});

test("normalizarPeriodos rejeita período invertido e sem responsável", () => {
  const invertido = normalizarPeriodos([{ inicio: "2026-06-10", fim: "2026-06-01", responsavelId: 1 }]);
  assert.equal(invertido.ok, false);
  const semResp = normalizarPeriodos([{ inicio: "2026-06-01", fim: "2026-06-10", responsavelId: 0 }]);
  assert.equal(semResp.ok, false);
});

test("responsavelParaData usa o período que cobre a data e devolve null fora deles", () => {
  const periodos = [
    { inicio: D(2026, 1, 1), fim: D(2026, 6, 30), responsavelId: 10 },
    { inicio: D(2026, 7, 1), fim: D(2026, 12, 31), responsavelId: 20 },
  ];
  assert.equal(responsavelParaData(periodos, D(2026, 3, 15)), 10);
  assert.equal(responsavelParaData(periodos, D(2026, 9, 1)), 20);
  assert.equal(responsavelParaData(periodos, D(2025, 12, 31)), null);
});
