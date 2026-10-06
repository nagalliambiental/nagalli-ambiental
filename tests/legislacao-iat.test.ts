import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLegislacaoIat,
  extrairDataPublicacao,
} from "../src/lib/legislacao-iat";

const HTML_EXEMPLO = `
<html><body>
<nav>Menu</nav>
<div class="field--name-field-texto">
  <p><a href="/sites/default/files/2023-08/norma-in-05-2023.pdf">Instrução Normativa n. 05/2023</a> - Estabelece regras para licenciamento ambiental de resíduos.</p>
  <p><a href="/sites/default/files/2023-08/anexo-in-05.pdf">Anexos</a></p>
  <p>Orientação Técnica n. 02/2022 - Diretrizes para emissão de certificados. (REVOGADA pela IN n. 26/2026)</p>
  <p>Instrução Normativa n. 05/2023 - Estabelece regras para licenciamento ambiental de resíduos.</p>
  <p><a href="https://www.iat.pr.gov.br/sites/default/files/2021-03/norma-in-10-2021.pdf">IN n. 10/2021</a> - Regulamenta o cadastro ambiental.</p>
</div>
<footer id="main-footer">Rodapé</footer>
</body></html>
`;

test("parse: vigente com link, anexos e ementa", () => {
  const itens = parseLegislacaoIat(HTML_EXEMPLO);
  const in05 = itens.find((i) => i.tipo === "IN" && i.numero === 5 && i.ano === 2023);
  assert.ok(in05);
  assert.equal(in05.titulo, "Instrução Normativa n. 05/2023");
  assert.equal(in05.situacao, "vigente");
  assert.equal(in05.ementa, "Estabelece regras para licenciamento ambiental de resíduos.");
  assert.equal(in05.url, "https://www.iat.pr.gov.br/sites/default/files/2023-08/norma-in-05-2023.pdf");
  assert.equal(in05.anexosUrl, "https://www.iat.pr.gov.br/sites/default/files/2023-08/anexo-in-05.pdf");
  assert.equal(in05.revogadaPor, null);
  assert.ok(in05.hash.length > 0);
});

test("parse: revogada sem link extrai revogadaPor e limpa a ementa", () => {
  const itens = parseLegislacaoIat(HTML_EXEMPLO);
  const ot02 = itens.find((i) => i.tipo === "OT" && i.numero === 2 && i.ano === 2022);
  assert.ok(ot02);
  assert.equal(ot02.situacao, "revogada");
  assert.equal(ot02.revogadaPor, "IN n. 26/2026");
  assert.equal(ot02.ementa, "Diretrizes para emissão de certificados.");
  assert.equal(ot02.url, null);
});

test("parse: deduplica por tipo/número/ano mantendo a primeira ocorrência", () => {
  const itens = parseLegislacaoIat(HTML_EXEMPLO);
  const repetida = itens.filter((i) => i.tipo === "IN" && i.numero === 5 && i.ano === 2023);
  assert.equal(repetida.length, 1);
  assert.equal(itens.length, 3);
});

test("parse: sigla IN aceita url absoluta sem alterar", () => {
  const itens = parseLegislacaoIat(HTML_EXEMPLO);
  const in10 = itens.find((i) => i.numero === 10 && i.ano === 2021);
  assert.ok(in10);
  assert.equal(in10.url, "https://www.iat.pr.gov.br/sites/default/files/2021-03/norma-in-10-2021.pdf");
  assert.equal(in10.ementa, "Regulamenta o cadastro ambiental.");
});

test("extrairDataPublicacao: pega ano-mês da pasta do PDF", () => {
  assert.equal(
    extrairDataPublicacao("https://www.iat.pr.gov.br/sites/default/files/2023-08/norma-in-05-2023.pdf"),
    "2023-08",
  );
  assert.equal(extrairDataPublicacao(null), null);
  assert.equal(extrairDataPublicacao("https://www.iat.pr.gov.br/norma.pdf"), null);
});
