import { test } from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import { renderEmbargosDocx } from "../src/lib/templates/embargos/generate";

function textoDocx(buffer: Buffer): string {
  return new PizZip(buffer)
    .file("word/document.xml")!
    .asText()
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1");
}

test("embargos preenche todos os campos sem deixar tags", () => {
  const xml = textoDocx(
    renderEmbargosDocx({
      razao_social: "EMPRESA TESTE LTDA",
      cnpj: "12.345.678/0001-90",
      endereco: "Rua X, 123 - Centro, Curitiba/PR",
      tipo_licenca: "Licença Prévia",
      municipio_data: "Curitiba",
      dia: "13",
      mes: "Outubro",
      ano: "2026",
    })
  );
  assert.ok(!xml.includes("undefined"), "template imprimiu 'undefined'");
  assert.ok(!/\{[a-z_]+\}/.test(xml), "restaram tags não preenchidas");
  assert.ok(!/\[[^\]]+\]/.test(xml), "restaram colchetes do modelo");
  assert.ok(xml.includes("EMPRESA TESTE LTDA"));
  assert.ok(xml.includes("12.345.678/0001-90"));
  assert.ok(xml.includes("Curitiba, 13 de Outubro de 2026"));
});
