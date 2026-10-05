import { test } from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import {
  emptyPgrccIatFormData,
  PgrccIatFormData,
  CARACTERIZACAO_ROWS,
  REUTILIZACAO_ROWS,
  ACONDICIONAMENTO_ROWS,
} from "../src/lib/templates/pgrcc-iat/config";
import { buildDocxData, renderDocx } from "../src/lib/templates/pgrcc-iat/generate";
import { extrairPgrccDoTexto } from "../src/lib/pgrcc-iat-extract";

function extrairTexto(buf: Buffer): string {
  const zip = new PizZip(buf);
  const docXml = zip.file("word/document.xml")?.asText() || "";
  return docXml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function num(v?: string): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function mock(): PgrccIatFormData {
  const m = emptyPgrccIatFormData();
  m.clienteRazaoSocial = "ACME CONSTRUCOES LTDA";
  m.clienteNomeFantasia = "ACME OBRA";
  m.clienteEndereco = "Rua das Obras, 123 - Centro, Curitiba/PR, 80000-000";
  m.clienteCpfCnpj = "12.345.678/0001-90";
  m.responsavelLegal1 = "Responsavel Legal Um";
  m.responsavelLegal1Cpf = "111.111.111-11";
  m.responsavelLegal2 = "Responsavel Legal Dois";
  m.responsavelLegal2Cpf = "222.222.222-22";
  m.clienteTelefone = "(41) 99999-0001";
  m.clienteEmail = "contato@acme.com.br";

  m.elabRazaoSocial = "NAGALLI AMBIENTAL LTDA";
  m.elabEndereco = "Av. Nagalli, 500 - Batel, Curitiba/PR";
  m.elabCnpj = "98.765.432/0001-10";
  m.elabResponsavelLegal = "Claudia da Silva Leite Nagalli";
  m.elabTelefone = "(41) 3333-0000";
  m.elabEmail = "contato@nagalli.com.br";

  m.empNome = "Obra Nova Torre";
  m.empIndicacaoFiscal = "IF-777";
  m.empTelefone = "(41) 98888-0002";
  m.empEmail = "obra@acme.com.br";
  m.empLicencaPrevia = "LP-12345";
  m.empModalidade = "Residencial em alvenaria";
  m.empRua = "Rua da Obra";
  m.empNumero = "456";
  m.empBairro = "Jardim Social";
  m.empMunicipio = "Curitiba/PR";
  m.empProcessoConstrutivo = "Construcao em concreto armado com formas de madeira";
  m.empMetragem = "1500,5";
  m.empInicioObra = "08/2026";
  m.empTerminoObra = "12/2026";

  m.respElabNome = "Eng Carlos Elab";
  m.respElabConselho = "CREA-PR 12345";
  m.respElabArt = "ART-999";
  m.respElabEmpresa = "NAGALLI AMBIENTAL LTDA";
  m.respElabEndereco = "Av. Nagalli, 500 - Batel";
  m.respElabTelefone = "(41) 3333-0001";
  m.respElabEmail = "carlos@nagalli.com.br";

  m.respImplNome = "Eng Joana Impl";
  m.respImplCpf = "333.333.333-33";
  m.respImplConselho = "CREA-PR 67890";
  m.respImplArt = "ART-888";
  m.respImplEmpresa = "CONSTRUTORA IMPL LTDA";
  m.respImplEndereco = "Rua Impl, 321 - Centro";
  m.respImplTelefone = "(41) 97777-0003";
  m.respImplEmail = "joana@impl.com.br";

  m.caracterizacao = CARACTERIZACAO_ROWS.map((r) => ({
    id: r.id,
    demolicao: r.id === "solo" ? "1,5" : r.id === "premoldados" ? "3,5" : r.id === "outros_a" ? "7,25" : "",
    construcao: r.id === "solo" ? "4,5" : r.id === "ceramicos" ? "3,25" : "",
    especificar: r.outro ? `Rejeito ${r.classe}` : undefined,
  }));
  m.reutilizacao = REUTILIZACAO_ROWS.map((r) => ({
    id: r.id,
    processo: r.id === "solo" ? "Aplicacao solo" : r.id === "premoldados" ? "So processo" : "",
    quantidade: r.id === "solo" ? "1,0" : r.id === "ceramicos" ? "2,0" : "",
    especificar: r.outro ? `Outro reutil ${r.classe}` : undefined,
  }));
  m.acondicionamento = ACONDICIONAMENTO_ROWS.map((r) => ({
    id: r.id,
    forma: r.id === "solo" ? "Big bag solo" : r.id === "ceramicos" ? "Caixote" : "",
    especificar: r.outro ? `Outro acond ${r.classe}` : undefined,
  }));
  m.transporte = m.transporte.map((r, i) =>
    i < 2 ? { ...r, empresa: `Transportadora ${i + 1}`, licenca: `LIC-T${i + 1}` } : r
  );
  m.transportesQuantidades = { solo: "10,0", excetoSolo: "20,0", b: "30,0", c: "40,0", d: "50,0" };
  m.destinacao = m.destinacao.map((r) => ({
    ...r,
    empresa: `Destinacao ${r.id.toUpperCase()}`,
    licenca: `LIC-D-${r.id.toUpperCase()}`,
    endereco: `Rua Dest ${r.id.toUpperCase()}, 10`,
    orgao: "ISEA-PR",
    municipio: "Colombo/PR",
    validade: "31/12/2027",
    indicacaoFiscal: `IF-D-${r.id.toUpperCase()}`,
  }));
  m.assinaturaCidade = "Curitiba";
  m.assinaturaDia = "5";
  m.assinaturaMes = "outubro";
  m.assinaturaAno = "2026";
  return m;
}

test("PGRCC roundtrip: extrai todos os campos do documento gerado", () => {
  const texto = extrairTexto(renderDocx(buildDocxData(mock())));
  const got = extrairPgrccDoTexto(texto);

  assert.equal(got.clienteRazaoSocial, "ACME CONSTRUCOES LTDA");
  assert.equal(got.clienteNomeFantasia, "ACME OBRA");
  assert.equal(got.clienteEndereco, "Rua das Obras, 123 - Centro, Curitiba/PR, 80000-000");
  assert.equal(got.clienteCpfCnpj, "12.345.678/0001-90");
  assert.equal(got.responsavelLegal1, "Responsavel Legal Um");
  assert.equal(got.responsavelLegal1Cpf, "111.111.111-11");
  assert.equal(got.responsavelLegal2, "Responsavel Legal Dois");
  assert.equal(got.responsavelLegal2Cpf, "222.222.222-22");
  assert.equal(got.clienteTelefone, "(41) 99999-0001");
  assert.equal(got.clienteEmail, "contato@acme.com.br");

  assert.equal(got.elabRazaoSocial, "NAGALLI AMBIENTAL LTDA");
  assert.equal(got.elabEndereco, "Av. Nagalli, 500 - Batel, Curitiba/PR");
  assert.equal(got.elabCnpj, "98.765.432/0001-10");
  assert.equal(got.elabResponsavelLegal, "Claudia da Silva Leite Nagalli");
  assert.equal(got.elabTelefone, "(41) 3333-0000");
  assert.equal(got.elabEmail, "contato@nagalli.com.br");

  assert.equal(got.empNome, "Obra Nova Torre");
  assert.equal(got.empIndicacaoFiscal, "IF-777");
  assert.equal(got.empTelefone, "(41) 98888-0002");
  assert.equal(got.empEmail, "obra@acme.com.br");
  assert.equal(got.empLicencaPrevia, "LP-12345");
  assert.equal(got.empModalidade, "Residencial em alvenaria");
  assert.equal(got.empRua, "Rua da Obra");
  assert.equal(got.empNumero, "456");
  assert.equal(got.empBairro, "Jardim Social");
  assert.equal(got.empMunicipio, "Curitiba/PR");
  assert.equal(got.empProcessoConstrutivo, "Construcao em concreto armado com formas de madeira");
  assert.equal(got.empMetragem, "1500,5");
  assert.equal(got.empInicioObra, "08/2026");
  assert.equal(got.empTerminoObra, "12/2026");

  assert.equal(got.respElabNome, "Eng Carlos Elab");
  assert.equal(got.respElabConselho, "CREA-PR 12345");
  assert.equal(got.respElabArt, "ART-999");
  assert.equal(got.respElabEmpresa, "NAGALLI AMBIENTAL LTDA");
  assert.equal(got.respElabEndereco, "Av. Nagalli, 500 - Batel");
  assert.equal(got.respElabTelefone, "(41) 3333-0001");
  assert.equal(got.respElabEmail, "carlos@nagalli.com.br");

  assert.equal(got.respImplNome, "Eng Joana Impl");
  assert.equal(got.respImplCpf, "333.333.333-33");
  assert.equal(got.respImplConselho, "CREA-PR 67890");
  assert.equal(got.respImplArt, "ART-888");
  assert.equal(got.respImplEmpresa, "CONSTRUTORA IMPL LTDA");
  assert.equal(got.respImplEndereco, "Rua Impl, 321 - Centro");
  assert.equal(got.respImplTelefone, "(41) 97777-0003");
  assert.equal(got.respImplEmail, "joana@impl.com.br");

  assert.ok(got.caracterizacao, "caracterizacao presente");
  const char = new Map(got.caracterizacao!.map((r) => [r.id, r]));
  assert.equal(char.get("solo")!.demolicao, "1,5");
  assert.equal(char.get("solo")!.construcao, "4,5");
  assert.equal(num(char.get("ceramicos")!.demolicao) + num(char.get("ceramicos")!.construcao), 3.25);
  assert.equal(char.get("premoldados")!.demolicao, "3,5");
  assert.equal(char.get("argamassa")!.demolicao, "");
  assert.equal(char.get("argamassa")!.construcao, "");
  assert.equal(char.get("outros_a")!.especificar, "Rejeito A");
  assert.equal(num(char.get("outros_a")!.demolicao) + num(char.get("outros_a")!.construcao), 7.25);

  assert.ok(got.reutilizacao, "reutilizacao presente");
  const reutil = new Map(got.reutilizacao!.map((r) => [r.id, r]));
  assert.equal(reutil.get("solo")!.processo, "Aplicacao solo");
  assert.equal(reutil.get("solo")!.quantidade, "1,0");
  assert.equal(reutil.get("ceramicos")!.processo, "");
  assert.equal(reutil.get("ceramicos")!.quantidade, "2,0");
  assert.equal(reutil.get("premoldados")!.processo, "So processo");
  assert.equal(reutil.get("premoldados")!.quantidade, "");
  assert.equal(reutil.get("argamassa")!.processo, "");
  assert.equal(reutil.get("outros_a")!.especificar, "Outro reutil A");

  assert.ok(got.acondicionamento, "acondicionamento presente");
  const acond = new Map(got.acondicionamento!.map((r) => [r.id, r]));
  assert.equal(acond.get("solo")!.forma, "Big bag solo");
  assert.equal(acond.get("ceramicos")!.forma, "Caixote");
  assert.equal(acond.get("argamassa")!.forma, "");
  assert.equal(acond.get("outros_a")!.especificar, "Outro acond A");

  assert.ok(got.transporte, "transporte presente");
  assert.equal(got.transporte![0].empresa, "Transportadora 1");
  assert.equal(got.transporte![0].licenca, "LIC-T1");
  assert.equal(got.transporte![1].empresa, "Transportadora 2");
  assert.equal(got.transporte![1].licenca, "LIC-T2");
  assert.equal(got.transporte![2].empresa, "");
  assert.ok(got.transportesQuantidades, "quantidades presentes");
  assert.equal(got.transportesQuantidades!.solo, "10,0");
  assert.equal(got.transportesQuantidades!.excetoSolo, "20,0");
  assert.equal(got.transportesQuantidades!.b, "30,0");
  assert.equal(got.transportesQuantidades!.c, "40,0");
  assert.equal(got.transportesQuantidades!.d, "50,0");

  assert.ok(got.destinacao, "destinacao presente");
  const destA = got.destinacao!.find((r) => r.id === "a")!;
  assert.equal(destA.empresa, "Destinacao A");
  assert.equal(destA.licenca, "LIC-D-A");
  assert.equal(destA.endereco, "Rua Dest A, 10");
  assert.equal(destA.orgao, "ISEA-PR");
  assert.equal(destA.municipio, "Colombo/PR");
  assert.equal(destA.validade, "31/12/2027");
  assert.equal(destA.indicacaoFiscal, "IF-D-A");
  const destD = got.destinacao!.find((r) => r.id === "d")!;
  assert.equal(destD.empresa, "Destinacao D");
  assert.equal(destD.indicacaoFiscal, "IF-D-D");

  assert.equal(got.assinaturaCidade, "Curitiba");
  assert.equal(got.assinaturaDia, "5");
  assert.equal(got.assinaturaMes, "outubro");
  assert.equal(got.assinaturaAno, "2026");
});

test("PGRCC: documento vazio não retorna tabelas", () => {
  const texto = extrairTexto(renderDocx(buildDocxData(emptyPgrccIatFormData())));
  const got = extrairPgrccDoTexto(texto);
  assert.equal(got.caracterizacao, undefined);
  assert.equal(got.reutilizacao, undefined);
  assert.equal(got.acondicionamento, undefined);
  assert.equal(got.transporte, undefined);
  assert.equal(got.transportesQuantidades, undefined);
  assert.equal(got.destinacao, undefined);
  assert.equal(got.assinaturaCidade, undefined);
});

test("PGRCC: texto sem estrutura não retorna campos", () => {
  const got = extrairPgrccDoTexto("texto qualquer sem estrutura de formulario");
  assert.equal(Object.keys(got).length, 0);
});
