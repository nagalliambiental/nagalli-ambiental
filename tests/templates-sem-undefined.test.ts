import test from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import type { Cliente, Configuracao } from "@prisma/client";

import {
  buildDocxData as buildSj,
  renderDocx as renderSj,
} from "../src/lib/templates/pgrs-sj-pinhais/generate";
import { emptyPgrsSjFormData } from "../src/lib/templates/pgrs-sj-pinhais/config";
import {
  buildDocxData as buildCuritiba,
  renderDocx as renderCuritiba,
} from "../src/lib/templates/pgrs-curitiba/generate";
import { emptyPgrsCuritibaFormData } from "../src/lib/templates/pgrs-curitiba/config";
import {
  buildDocxData as buildPinhais,
  renderDocx as renderPinhais,
} from "../src/lib/templates/pgrs-pinhais/generate";
import { emptyPgrsFormData as emptyPgrsPinhaisFormData } from "../src/lib/templates/pgrs-pinhais/config";

const cliente = { razaoSocial: "Empresa Teste Ltda" } as unknown as Cliente;
const configuracao = null as Configuracao | null;

function documentXml(buffer: Buffer): string {
  return new PizZip(buffer).file("word/document.xml")!.asText();
}

function renderAllVazio(
  build: (c: Cliente, f: never, g: Configuracao | null) => Record<string, unknown>,
  render: (d: Record<string, unknown>) => Buffer,
  form: unknown
): string {
  const data = build(cliente, form as never, configuracao);
  return documentXml(render(data));
}

test("template PGRS São José dos Pinhais não imprime 'undefined' com dados vazios", () => {
  const xml = renderAllVazio(buildSj, renderSj, emptyPgrsSjFormData());
  assert.ok(!xml.includes("undefined"), "template SJ imprimiu 'undefined'");
});

test("template PGRS Curitiba não imprime 'undefined' com dados vazios", () => {
  const xml = renderAllVazio(buildCuritiba, renderCuritiba, emptyPgrsCuritibaFormData());
  assert.ok(!xml.includes("undefined"), "template Curitiba imprimiu 'undefined'");
});

test("template PGRS Pinhais não imprime 'undefined' com dados vazios", () => {
  const xml = renderAllVazio(buildPinhais, renderPinhais, emptyPgrsPinhaisFormData());
  assert.ok(!xml.includes("undefined"), "template Pinhais imprimiu 'undefined'");
});
