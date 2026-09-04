import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import { PgrccIatFormData } from "./config";

function numero(v?: string | null): number {
  const n = parseFloat(String(v ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmt(v: number): string {
  if (v === 0) return "";
  const r = Math.round(v * 1000) / 1000;
  return String(r).replace(".", ",");
}

const CLASSE_IDS: Record<"a" | "b" | "c" | "d", string[]> = {
  a: ["solo", "ceramicos", "premoldados", "argamassa", "asfaltico", "outros_a"],
  b: ["plasticos", "papel", "metais", "vidros", "madeiras", "gesso", "outros_b"],
  c: ["manta", "vidro_massa", "poliuretano", "outros_c"],
  d: ["tintas", "solventes", "oleos", "amianto", "outros_d"],
};

export function buildDocxData(form: PgrccIatFormData): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, v?: string | null) => {
    out[k] = v == null ? "" : v;
  };

  put("cliente_razao_social", form.clienteRazaoSocial);
  put("cliente_nome_fantasia", form.clienteNomeFantasia);
  put("cliente_endereco", form.clienteEndereco);
  put("cliente_cpf_cnpj", form.clienteCpfCnpj);
  put("responsavel_legal_1", form.responsavelLegal1);
  put("responsavel_legal_1_cpf", form.responsavelLegal1Cpf);
  put("responsavel_legal_2", form.responsavelLegal2);
  put("responsavel_legal_2_cpf", form.responsavelLegal2Cpf);
  put("cliente_telefone", form.clienteTelefone);
  put("cliente_email", form.clienteEmail);

  put("elab_razao_social", form.elabRazaoSocial);
  put("elab_endereco", form.elabEndereco);
  put("elab_cnpj", form.elabCnpj);
  put("elab_responsavel_legal", form.elabResponsavelLegal);
  put("elab_telefone", form.elabTelefone);
  put("elab_email", form.elabEmail);

  put("emp_nome", form.empNome);
  put("emp_indicacao_fiscal", form.empIndicacaoFiscal);
  put("emp_telefone", form.empTelefone);
  put("emp_email", form.empEmail);
  put("emp_licenca_previa", form.empLicencaPrevia);
  put("emp_modalidade", form.empModalidade);
  put("emp_rua", form.empRua);
  put("emp_numero", form.empNumero);
  put("emp_bairro", form.empBairro);
  put("emp_municipio", form.empMunicipio);
  put("emp_processo_construtivo", form.empProcessoConstrutivo);
  put("emp_metragem", form.empMetragem);
  put("emp_inicio_obra", form.empInicioObra);
  put("emp_termino_obra", form.empTerminoObra);

  put("resp_elab_nome", form.respElabNome);
  put("resp_elab_conselho", form.respElabConselho);
  put("resp_elab_art", form.respElabArt);
  put("resp_elab_empresa", form.respElabEmpresa);
  put("resp_elab_endereco", form.respElabEndereco);
  put("resp_elab_telefone", form.respElabTelefone);
  put("resp_elab_email", form.respElabEmail);

  put("resp_impl_nome", form.respImplNome);
  put("resp_impl_cpf", form.respImplCpf);
  put("resp_impl_conselho", form.respImplConselho);
  put("resp_impl_art", form.respImplArt);
  put("resp_impl_empresa", form.respImplEmpresa);
  put("resp_impl_endereco", form.respImplEndereco);
  put("resp_impl_telefone", form.respImplTelefone);
  put("resp_impl_email", form.respImplEmail);

  const charTotalPorLinha = (id: string): number => {
    const row = form.caracterizacao.find((r) => r.id === id);
    return numero(row?.demolicao) + numero(row?.construcao);
  };
  const totalClasse = (ids: string[]): number =>
    ids.reduce((acc, id) => acc + charTotalPorLinha(id), 0);

  for (const row of form.caracterizacao) {
    const d = numero(row.demolicao);
    const c = numero(row.construcao);
    put(`char_${row.id}_demolicao`, fmt(d));
    put(`char_${row.id}_construcao`, fmt(c));
    put(`char_${row.id}_total`, fmt(d + c));
    if (row.especificar !== undefined) put(`char_${row.id}_especificar`, row.especificar);
  }

  const tA = totalClasse(CLASSE_IDS.a);
  const tB = totalClasse(CLASSE_IDS.b);
  const tC = totalClasse(CLASSE_IDS.c);
  const tD = totalClasse(CLASSE_IDS.d);
  const totalGeral = tA + tB + tC + tD;
  const totalSolo = charTotalPorLinha("solo");

  put("char_total_a", fmt(tA));
  put("char_total_b", fmt(tB));
  put("char_total_c", fmt(tC));
  put("char_total_d", fmt(tD));
  put("char_total_geral", fmt(totalGeral));

  put("resumo_solo", fmt(totalSolo));
  put("resumo_a_exceto_solo", fmt(tA - totalSolo));
  put("resumo_b", fmt(tB));
  put("resumo_c", fmt(tC));
  put("resumo_d", fmt(tD));
  put("resumo_total", fmt(totalGeral));

  for (const row of form.reutilizacao) {
    put(`reutil_${row.id}_processo`, row.processo);
    put(`reutil_${row.id}_quantidade`, row.quantidade);
    if (row.especificar !== undefined) put(`reutil_${row.id}_especificar`, row.especificar);
  }

  for (const row of form.acondicionamento) {
    put(`acond_${row.id}_forma`, row.forma);
    if (row.especificar !== undefined) put(`acond_${row.id}_especificar`, row.especificar);
  }

  for (const row of form.transporte) {
    put(`transp_${row.id}_empresa`, row.empresa);
    put(`transp_${row.id}_licenca`, row.licenca);
  }

  const reutilTotalClasse = (ids: string[]): number =>
    ids.reduce((acc, id) => {
      const row = form.reutilizacao.find((r) => r.id === id);
      return acc + numero(row?.quantidade);
    }, 0);

  const reutilA = reutilTotalClasse(CLASSE_IDS.a);
  const reutilB = reutilTotalClasse(CLASSE_IDS.b);
  const reutilC = reutilTotalClasse(CLASSE_IDS.c);
  const reutilD = reutilTotalClasse(CLASSE_IDS.d);
  const reutilSolo = numero(form.reutilizacao.find((r) => r.id === "solo")?.quantidade);

  const volumeClasse = {
    a: Math.max(0, tA - reutilA),
    b: Math.max(0, tB - reutilB),
    c: Math.max(0, tC - reutilC),
    d: Math.max(0, tD - reutilD),
  } as const;

  const q = form.transportesQuantidades;
  put("transp_quant_solo", q.solo || fmt(Math.max(0, totalSolo - reutilSolo)));
  put("transp_quant_exceto_solo", q.excetoSolo || fmt(Math.max(0, volumeClasse.a - (totalSolo - reutilSolo))));
  put("transp_quant_b", q.b || fmt(volumeClasse.b));
  put("transp_quant_c", q.c || fmt(volumeClasse.c));
  put("transp_quant_d", q.d || fmt(volumeClasse.d));
  for (const k of [
    "transp_quant_solo_2",
    "transp_quant_solo_3",
    "transp_quant_exceto_solo_2",
    "transp_quant_b_2",
    "transp_quant_b_3",
    "transp_quant_c_2",
    "transp_quant_d_2",
  ])
    put(k, "");
  for (const row of form.destinacao) {
    put(`dest_${row.id}_empresa`, row.empresa);
    put(`dest_${row.id}_licenca`, row.licenca);
    put(`dest_${row.id}_endereco`, row.endereco);
    put(`dest_${row.id}_orgao`, row.orgao);
    put(`dest_${row.id}_municipio`, row.municipio);
    put(`dest_${row.id}_validade`, row.validade);
    put(`dest_${row.id}_indicacao_fiscal`, row.indicacaoFiscal);
    put(`dest_${row.id}_volume`, fmt(volumeClasse[row.id]));
  }

  put("assinatura_cidade", form.assinaturaCidade);
  put("assinatura_dia", form.assinaturaDia);
  put("assinatura_mes", form.assinaturaMes);
  put("assinatura_ano", form.assinaturaAno);

  return out;
}

function mergeValue(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
}

export function renderDocx(data: Record<string, string>): Buffer {
  const templatePath = path.join(process.cwd(), "src/lib/templates/pgrcc-iat/template.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const docName = Object.keys(zip.files).find((x) => x.replace(/\\/g, "/") === "word/document.xml");
  if (!docName) throw new Error("word/document.xml ausente no template pgrcc-iat");
  let xml = Buffer.from(zip.files[docName].asBinary(), "binary").toString("utf8");
  for (const [key, value] of Object.entries(data)) {
    xml = xml.split(`[${key}]`).join(mergeValue(value));
  }
  zip.file(docName, Buffer.from(xml, "utf8"));
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
