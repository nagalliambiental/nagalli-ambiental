import { test } from "node:test";
import assert from "node:assert/strict";
import { ehPrivilegiado } from "../src/lib/perfil";
import { criptografar, descriptografar } from "../src/lib/crypto";
import { formatDateTime, formatDate } from "../src/lib/format";

test("ehPrivilegiado só aceita socio/admin", () => {
  assert.equal(ehPrivilegiado("socio"), true);
  assert.equal(ehPrivilegiado("admin"), true);
  assert.equal(ehPrivilegiado("tecnico"), false);
  assert.equal(ehPrivilegiado(undefined), false);
  assert.equal(ehPrivilegiado(""), false);
});

test("criptografar/descriptografar redondos", () => {
  const senha = "Senha@123!";
  const enc = criptografar(senha);
  assert.notEqual(enc, senha);
  assert.ok(enc.startsWith("enc:v1:"));
  assert.equal(descriptografar(enc), senha);
});

test("descriptografar preserva valores sem prefixo (migração)", () => {
  assert.equal(descriptografar("senha-plana"), "senha-plana");
  assert.equal(descriptografar(""), "");
});

test("formatDate formata dd/mm/aaaa", () => {
  const d = new Date("2024-05-01T12:00:00Z");
  const out = formatDate(d);
  assert.match(out, /^\d{2}\/\d{2}\/\d{4}$/);
});

test("formatDateTime aceita string ISO", () => {
  const out = formatDateTime("2024-05-01T12:00:00Z", "date");
  assert.match(out, /^\d{2}\/\d{2}\/\d{4}$/);
});
