import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { diasAte } from "../src/lib/backup";

test("diasAte retorna vazio para valor nulo", () => {
  assert.equal(diasAte(null), "");
  assert.equal(diasAte(undefined), "");
});

test("diasAte calcula dias até uma data futura", () => {
  const agora = new Date("2024-05-01T12:00:00Z").getTime();
  mock.method(Date, "now", () => agora);

  const futuro = new Date("2024-05-11T12:00:00Z");
  assert.equal(diasAte(futuro), 10);

  const passado = new Date("2024-04-20T12:00:00Z");
  assert.equal(diasAte(passado), -11);

  mock.restoreAll();
});
