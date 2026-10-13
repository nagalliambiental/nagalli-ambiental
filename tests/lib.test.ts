import { test } from "node:test";
import assert from "node:assert/strict";
import { ehPrivilegiado } from "../src/lib/perfil";
import { criptografar, descriptografar } from "../src/lib/crypto";
import { formatDateTime, formatDate } from "../src/lib/format";
import { classeDeResiduos } from "../src/lib/sinir";
import { extrairClasseMtrIma } from "../src/lib/mtr-ima-classificacao";

test("ehPrivilegiado só aceita socio/admin", () => {
  assert.equal(ehPrivilegiado("socio"), true);
  assert.equal(ehPrivilegiado("admin"), true);
  assert.equal(ehPrivilegiado("tecnico"), false);
  assert.equal(ehPrivilegiado(undefined), false);
  assert.equal(ehPrivilegiado(""), false);
});

test("classifica RCC Classe A solo pelo código IBAMA", () => {
  const classe = classeDeResiduos([{ classe: { claCodigo: 11 }, residuo: { resCodigoIbama: "170504", resDescricao: "Solos e rochas" } }]);
  assert.equal(classe.classeNome, "A (Solo)");
});

test("classifica RCC Classe A não solo", () => {
  const classe = classeDeResiduos([{ classe: { claCodigo: 11 }, residuo: { resCodigoIbama: "170102", resDescricao: "Tijolos (Classe A)" } }]);
  assert.equal(classe.classeNome, "A");
});

test("classifica pelo código IBAMA quando o SINIR não envia classe", () => {
  const classe = classeDeResiduos([{ residuo: { resCodigoIbama: "170301(*)", resDescricao: "Misturas betuminosas contendo alcatrão (Classe D)" } }]);
  assert.equal(classe.classeNome, "D");
});

test("NBR Classe I (perigoso) classifica como D — caso ELEPOL 160303(*)", () => {
  const classe = classeDeResiduos([{ classe: { claCodigo: 1, claDescricao: "CLASSE I" }, residuo: { resCodigoIbama: "160303(*)", resDescricao: "Resíduos inorgânicos contendo substâncias perigosas" } }]);
  assert.equal(classe.classeNome, "D");
});

test("RSS Grupo A (infectantes) classifica como D", () => {
  const classe = classeDeResiduos([{ classe: { claCodigo: 21, claDescricao: "GRUPO A1 (RSS)" }, residuo: { resCodigoIbama: "180104", resDescricao: "Resíduos de serviços de saúde" } }]);
  assert.equal(classe.classeNome, "D");
});

test("NBR Classe II A classifica como B e II B como C", () => {
  const b = classeDeResiduos([{ classe: { claCodigo: 43, claDescricao: "CLASSE II A" }, residuo: { resCodigoIbama: "x", resDescricao: "y" } }]);
  const c = classeDeResiduos([{ classe: { claDescricao: "CLASSE II B" }, residuo: { resCodigoIbama: "x", resDescricao: "y" } }]);
  assert.equal(b.classeNome, "B");
  assert.equal(c.classeNome, "C");
});

test("extrai classe nativa do PDF MTR-IMA colada ao estado físico", () => {
  assert.equal(extrairClasseMtrIma("Estado FísicoClasse\nLíquidoIIAE04 - Tanque"), "II A");
  assert.equal(extrairClasseMtrIma("Classe: II B"), "II B");
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
