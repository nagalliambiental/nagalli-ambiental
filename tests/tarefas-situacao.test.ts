import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoTarefa, diasAguardando } from "../src/lib/tarefas-situacao";

const AGORA = new Date("2026-10-13T12:00:00Z");
const AMANHA = new Date("2026-10-14T12:00:00Z");
const ONTEM = new Date("2026-10-12T12:00:00Z");

test("concluída nunca é atrasada", () => {
  const r = situacaoTarefa({ status: "concluida", substatus: "aguardando_cliente", prazoFinal: ONTEM }, AGORA);
  assert.equal(r.situacao, "concluida");
});

test("aguardando pausa o prazo: não marca atrasada mesmo com prazo vencido", () => {
  const r = situacaoTarefa({ status: "em_andamento", substatus: "aguardando_cliente", prazoFinal: ONTEM }, AGORA);
  assert.equal(r.situacao, "aguardando");
});

test("aguardando sem prazo também é aguardando", () => {
  const r = situacaoTarefa({ status: "em_andamento", substatus: "pausada", prazoFinal: null }, AGORA);
  assert.equal(r.situacao, "aguardando");
});

test("sem substatus e prazo vencido é atrasada", () => {
  const r = situacaoTarefa({ status: "em_andamento", prazoFinal: ONTEM }, AGORA);
  assert.equal(r.situacao, "atrasada");
  assert.equal(r.dias, -1);
});

test("vence dentro do alerta", () => {
  const r = situacaoTarefa({ status: "em_andamento", prazoFinal: AMANHA, alertaPrazoFinal: 30 }, AGORA);
  assert.equal(r.situacao, "vence_em");
  assert.equal(r.dias, 1);
});

test("sem prazo", () => {
  const r = situacaoTarefa({ status: "nao_iniciado", prazoFinal: null }, AGORA);
  assert.equal(r.situacao, "sem_prazo");
});

test("diasAguardando conta dias cheios desde a espera", () => {
  assert.equal(diasAguardando(new Date("2026-10-10T12:00:00Z"), AGORA), 3);
  assert.equal(diasAguardando(null, AGORA), 0);
});
