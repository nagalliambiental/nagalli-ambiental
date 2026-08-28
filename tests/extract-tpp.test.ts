import { test } from "node:test";
import assert from "node:assert/strict";
import { extrairTpp } from "../src/lib/extract-tpp";

const TEXTO_TPP = [
  "Ministério do Meio Ambiente",
  "Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis",
  "Autorização Ambiental para o Transporte",
  "Interestadual de Produtos Perigosos",
  "Modal Rodoviário",
  "Dados da Pessoa/Empresa",
  "N.º de registro no Banco de",
  "Dados: 8391530",
  "CPF/CNPJ: 95.387.023/0002-98Emitido em: 28/08/2026Válido até: 28/11/2026",
  "Nome/Razão Social/Endereço: ELEPOL COMERCIAL LTDA",
  "Veículos",
  "PlacaNº RNTRCTipo",
  "ATF2117N/ACaminhão",
  "AXK6H52N/ACaminhão",
  "GXM0H76N/AEquipamento",
  "Classes de Risco ( Res. ANTT 5998/2022 e suas atualizações)",
  "Classe 1: Explosivos",
  "Classe 9: Substâncias e Artigos Perigosos Diversos",
].join("\n");

test("extrairTpp identifica autorização TPP do IBAMA", () => {
  const r = extrairTpp(TEXTO_TPP);
  assert.equal(r.numero, "8391530");
  assert.equal(r.cnpj, "95387023000298");
  assert.equal(r.emitidoEm, "28/08/2026");
  assert.equal(r.validoAte, "28/11/2026");
});

test("extrairTpp extrai veículos e classes de risco", () => {
  const r = extrairTpp(TEXTO_TPP);
  assert.ok(r.veiculos?.includes("ATF2117 — Caminhão"));
  assert.ok(r.veiculos?.includes("GXM0H76 — Equipamento"));
  assert.ok(r.classesRisco?.includes("Classe 1 — Explosivos"));
  assert.ok(r.classesRisco?.includes("Classe 9"));
});

test("extrairTpp não interpreta placas fora da tabela de veículos", () => {
  const texto = [
    "Autorização Ambiental para o Transporte Interestadual de Produtos Perigosos",
    "CPF/CNPJ: 95.387.023/0002-98",
    "N.º de registro no Banco de Dados: 90210",
    "Veículos",
    "PlacaNº RNTRCTipo",
    "ATF2117N/ACaminhão",
    "Observações: qualquer texto com ABC1234 não é placa válida",
  ].join("\n");
  const r = extrairTpp(texto);
  assert.equal(r.numero, "90210");
  assert.ok(r.veiculos?.includes("ATF2117"));
  assert.ok(!r.veiculos?.includes("ABC1234"));
});

test("extrairTpp retorna null para documentos que não são TPP", () => {
  const r = extrairTpp("LICENÇA DE OPERAÇÃO Nº 1234\nValidade: 15/12/2026");
  assert.equal(r.numero, null);
  assert.equal(r.validoAte, null);
  assert.equal(r.veiculos, null);
});