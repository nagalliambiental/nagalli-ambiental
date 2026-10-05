import {
  CARACTERIZACAO_ROWS,
  REUTILIZACAO_ROWS,
  ACONDICIONAMENTO_ROWS,
  TRANSPORTE_ROWS,
  DESTINACAO_ROWS,
  PgrccIatFormData,
} from "./templates/pgrcc-iat/config";

type ChaveTexto = {
  [K in keyof PgrccIatFormData]: PgrccIatFormData[K] extends string ? K : never;
}[keyof PgrccIatFormData];

type Classe = "a" | "b" | "c" | "d";

const RE_NUM = /^-?\d[\d.,]*$/;
const RE_DATA_OBRA = /(\d{1,2}\/\d{4})\s+a\s+(\d{1,2}\/\d{4})/;
const RE_DATA_FINAL =
  /^([A-Za-zÀ-ÿ][\wÀ-ÿ\s]{1,30}?),\s*(\d{1,2})\s+de\s+([A-Za-zÀ-ÿ]+)\s+de\s+(\d{4})\.?\s*$/i;
const RE_CLASSE = /^classe ([a-d])$/;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function ehParagrafo(l: string): boolean {
  return l.length > 80 && l.trim().endsWith(".");
}

function acharInicio(nrm: string[], pred: (n: string) => boolean, desde = 0): number {
  for (let i = Math.max(desde, 0); i < nrm.length; i++) if (pred(nrm[i])) return i;
  return -1;
}

function janelaFim(nrm: string[], ini: number, predFim: (n: string) => boolean): number {
  if (ini < 0) return -1;
  for (let i = ini + 1; i < nrm.length; i++) if (predFim(nrm[i])) return i;
  return Math.min(nrm.length, ini + 121);
}

function preencherNomeCpf(
  valores: string[],
  out: Partial<PgrccIatFormData>,
  kNome: ChaveTexto,
  kCpf: ChaveTexto
): void {
  if (!valores.length) return;
  if (valores.length >= 2) {
    out[kNome] = valores[0];
    out[kCpf] = valores[1];
    return;
  }
  const v = valores[0];
  const m = v.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})\s*$/);
  if (m && m.index !== undefined) {
    out[kNome] = v.slice(0, m.index).trim();
    out[kCpf] = m[1];
  } else {
    out[kNome] = v;
  }
}

function extrairGenerico(
  brutas: string[],
  ini: number,
  fim: number,
  defs: [string, ChaveTexto][],
  out: Partial<PgrccIatFormData>
): void {
  if (ini < 0) return;
  const mapa = new Map<string, ChaveTexto>(defs.map(([l, k]) => [norm(l), k]));
  const pendentes: ChaveTexto[] = [];
  for (let i = ini; i < fim; i++) {
    const raw = brutas[i];
    const dm = raw.match(RE_DATA_OBRA);
    if (dm && norm(raw).includes("data de previsao")) {
      out.empInicioObra = dm[1];
      out.empTerminoObra = dm[2];
      continue;
    }
    const ci = raw.indexOf(":");
    if (ci >= 0) {
      const esq = norm(raw.slice(0, ci + 1));
      const dir = raw.slice(ci + 1).trim();
      const k = mapa.get(esq);
      if (dir === "") {
        if (k) pendentes.push(k);
      } else if (k) {
        out[k] = dir;
      }
      continue;
    }
    if (pendentes.length) out[pendentes.shift()!] = raw;
  }
}

function extrairResponsaveisLegais(
  brutas: string[],
  nrm: string[],
  out: Partial<PgrccIatFormData>
): void {
  const valoresEntre = (a: number, b: number): string[] =>
    brutas.slice(a, b).filter((l) => !norm(l).endsWith(":"));

  const i1 = nrm.findIndex((n) => n.startsWith("responsavel legal 1:"));
  const i2 = nrm.findIndex((n) => n.startsWith("responsavel legal 2:"));
  const iTel = nrm.findIndex((n) => n.startsWith("telefone:"));

  if (i1 >= 0) {
    const fim = i2 > i1 ? i2 : iTel > i1 ? iTel : brutas.length;
    preencherNomeCpf(valoresEntre(i1 + 1, fim), out, "responsavelLegal1", "responsavelLegal1Cpf");
  }
  if (i2 >= 0) {
    const fim = iTel > i2 ? iTel : brutas.length;
    preencherNomeCpf(valoresEntre(i2 + 1, fim), out, "responsavelLegal2", "responsavelLegal2Cpf");
  }
}

function extrairResponsavelImplantacao(
  brutas: string[],
  nrm: string[],
  out: Partial<PgrccIatFormData>
): void {
  const ini = nrm.findIndex((n) => n.startsWith("responsavel tecnico pela implementacao"));
  if (ini < 0) return;
  let fim = brutas.length;
  for (let i = ini + 1; i < brutas.length; i++) {
    if (nrm[i].startsWith("conselho de classe")) {
      fim = i;
      break;
    }
  }
  const valores = brutas.slice(ini + 1, fim).filter((l) => !norm(l).endsWith(":"));
  preencherNomeCpf(valores, out, "respImplNome", "respImplCpf");
}

function extrairCaracterizacao(
  brutas: string[],
  ini: number,
  fim: number,
  out: Partial<PgrccIatFormData>
): void {
  if (ini < 0 || fim <= ini) return;
  const base = new Map<string, string>();
  for (const r of CARACTERIZACAO_ROWS) if (!r.outro) base.set(norm(r.label), r.id);

  const linhas: Record<string, { d: string; c: string; esp?: string }> = {};
  let classe: Classe | null = null;
  let atual: string | null = null;
  let nums: string[] = [];

  const fechar = () => {
    if (atual && nums.length) {
      const r = (linhas[atual] ??= { d: "", c: "" });
      if (nums.length >= 3) {
        r.d = nums[0];
        r.c = nums[1];
      } else {
        r.d = nums[0];
        r.c = "";
      }
    }
    nums = [];
  };

  for (let i = ini; i < fim; i++) {
    const raw = brutas[i];
    const n = norm(raw);
    if (ehParagrafo(raw)) {
      fechar();
      atual = null;
      continue;
    }
    if (RE_CLASSE.test(n)) {
      fechar();
      classe = n.slice(-1) as Classe;
      atual = null;
      continue;
    }
    if (n.startsWith("total")) {
      fechar();
      atual = null;
      continue;
    }
    const outros = n.startsWith("outros") && classe;
    if (outros) {
      fechar();
      atual = `outros_${classe}`;
      const r = (linhas[atual] ??= { d: "", c: "" });
      const m = raw.match(/[–-]\s*(.+)$/);
      r.esp = m ? m[1].trim() : "";
      continue;
    }
    const id = base.get(n);
    if (id) {
      fechar();
      atual = id;
      continue;
    }
    if (RE_NUM.test(n)) {
      if (atual) nums.push(n);
      continue;
    }
    fechar();
    atual = null;
  }
  fechar();

  const temDado = Object.values(linhas).some((r) => r.d || r.c || r.esp);
  if (!temDado) return;
  out.caracterizacao = CARACTERIZACAO_ROWS.map((r) => ({
    id: r.id,
    demolicao: linhas[r.id]?.d ?? "",
    construcao: linhas[r.id]?.c ?? "",
    especificar: r.outro ? (linhas[r.id]?.esp ?? "") : undefined,
  }));
}

function extrairReutilizacao(
  brutas: string[],
  ini: number,
  fim: number,
  out: Partial<PgrccIatFormData>
): void {
  if (ini < 0 || fim <= ini) return;
  const base = new Map<string, string>();
  for (const r of REUTILIZACAO_ROWS) if (!r.outro) base.set(norm(r.label), r.id);

  const linhas: Record<string, { proc: string; qtd: string; esp?: string }> = {};
  let classe: Classe | null = null;
  let atual: string | null = null;
  let vals: string[] = [];

  const fechar = () => {
    if (atual && vals.length) {
      const r = (linhas[atual] ??= { proc: "", qtd: "" });
      const nums = vals.filter((v) => RE_NUM.test(norm(v)));
      const naoNums = vals.filter((v) => !RE_NUM.test(norm(v)));
      if (nums.length) r.qtd = nums[nums.length - 1];
      if (naoNums.length) r.proc = naoNums.join(" ");
    }
    vals = [];
  };

  for (let i = ini; i < fim; i++) {
    const raw = brutas[i];
    const n = norm(raw);
    if (ehParagrafo(raw)) {
      fechar();
      atual = null;
      continue;
    }
    if (RE_CLASSE.test(n)) {
      fechar();
      classe = n.slice(-1) as Classe;
      atual = null;
      continue;
    }
    if (n.startsWith("outros") && classe) {
      fechar();
      atual = `outros_${classe}`;
      const r = (linhas[atual] ??= { proc: "", qtd: "" });
      const m = raw.match(/[–-]\s*(.+)$/);
      if (m) r.esp = m[1].trim();
      continue;
    }
    const id = base.get(n);
    if (id) {
      fechar();
      atual = id;
      continue;
    }
    if (RE_NUM.test(n)) {
      if (atual) vals.push(raw);
      continue;
    }
    if (atual) {
      vals.push(raw);
      continue;
    }
    fechar();
    atual = null;
  }
  fechar();

  const temDado = Object.values(linhas).some((r) => r.proc || r.qtd || r.esp);
  if (!temDado) return;
  out.reutilizacao = REUTILIZACAO_ROWS.map((r) => ({
    id: r.id,
    processo: linhas[r.id]?.proc ?? "",
    quantidade: linhas[r.id]?.qtd ?? "",
    especificar: r.outro ? (linhas[r.id]?.esp ?? "") : undefined,
  }));
}

function extrairAcondicionamento(
  brutas: string[],
  ini: number,
  fim: number,
  out: Partial<PgrccIatFormData>
): void {
  if (ini < 0 || fim <= ini) return;
  const base = new Map<string, string>();
  for (const r of ACONDICIONAMENTO_ROWS) if (!r.outro) base.set(norm(r.label), r.id);

  const linhas: Record<string, { forma: string; esp?: string }> = {};
  let classe: Classe | null = null;
  let atual: string | null = null;
  let vals: string[] = [];

  const fechar = () => {
    if (atual && vals.length) {
      const r = (linhas[atual] ??= { forma: "" });
      r.forma = vals.join(" ");
    }
    vals = [];
  };

  for (let i = ini; i < fim; i++) {
    const raw = brutas[i];
    const n = norm(raw);
    if (ehParagrafo(raw)) {
      fechar();
      atual = null;
      continue;
    }
    if (RE_CLASSE.test(n)) {
      fechar();
      classe = n.slice(-1) as Classe;
      atual = null;
      continue;
    }
    if (n.startsWith("outros") && classe) {
      fechar();
      atual = `outros_${classe}`;
      const r = (linhas[atual] ??= { forma: "" });
      const m = raw.match(/[–-]\s*(.+)$/);
      if (m) r.esp = m[1].trim();
      continue;
    }
    const id = base.get(n);
    if (id) {
      fechar();
      atual = id;
      continue;
    }
    if (atual) {
      vals.push(raw);
      continue;
    }
    fechar();
    atual = null;
  }
  fechar();

  const temDado = Object.values(linhas).some((r) => r.forma || r.esp);
  if (!temDado) return;
  out.acondicionamento = ACONDICIONAMENTO_ROWS.map((r) => ({
    id: r.id,
    forma: linhas[r.id]?.forma ?? "",
    especificar: r.outro ? (linhas[r.id]?.esp ?? "") : undefined,
  }));
}

function extrairTransporte(
  brutas: string[],
  ini: number,
  fim: number,
  out: Partial<PgrccIatFormData>
): void {
  if (ini < 0 || fim <= ini) return;
  const ignorar = [
    "classe do residuo",
    "empresa responsavel pelo transporte",
    "nº da licenca ambiental da empresa",
    "quantidade estimada de transporte",
  ].map(norm);
  const classes: Record<string, keyof typeof quants> = {
    "a (solo)": "solo",
    "a (exceto solo)": "excetoSolo",
    b: "b",
    c: "c",
    d: "d",
  };
  const quants: Record<"solo" | "excetoSolo" | "b" | "c" | "d", string> = {
    solo: "",
    excetoSolo: "",
    b: "",
    c: "",
    d: "",
  };
  const empresas: { empresa: string; licenca: string }[] = [];
  let atual: keyof typeof quants | null = null;
  let buf: string[] = [];

  const guardar = () => {
    if (buf.length) {
      empresas.push({ empresa: buf[0], licenca: buf[1] ?? "" });
      buf = [];
    }
  };

  for (let i = ini; i < fim; i++) {
    const raw = brutas[i];
    const n = norm(raw);
    if (ehParagrafo(raw)) break;
    if (ignorar.some((p) => n.startsWith(p))) continue;
    if (n in classes) {
      guardar();
      atual = classes[n];
      continue;
    }
    if (RE_NUM.test(n) && buf.length === 0 && atual && !quants[atual]) {
      quants[atual] = raw;
      continue;
    }
    buf.push(raw);
    if (buf.length === 2) {
      empresas.push({ empresa: buf[0], licenca: buf[1] });
      buf = [];
    }
  }
  guardar();

  if (empresas.some((e) => e.empresa || e.licenca)) {
    out.transporte = TRANSPORTE_ROWS.map((r, i) => ({
      id: r.id,
      empresa: empresas[i]?.empresa ?? "",
      licenca: empresas[i]?.licenca ?? "",
    }));
  }
  if (Object.values(quants).some(Boolean)) {
    out.transportesQuantidades = quants;
  }
}

function extrairDestinacao(
  brutas: string[],
  nrm: string[],
  ini: number,
  fim: number,
  out: Partial<PgrccIatFormData>
): void {
  if (ini < 0 || fim <= ini) return;
  const defs: [string, string][] = [
    ["Local de destinação:", "empresa"],
    ["Licença/Autorização Ambiental nº:", "licenca"],
    ["Endereço:", "endereco"],
    ["Órgão expedidor:", "orgao"],
    ["Município:", "municipio"],
    ["Validade:", "validade"],
    ["Indicação fiscal:", "indicacaoFiscal"],
  ];
  const mapa = new Map<string, string>(defs.map(([l, k]) => [norm(l), k]));
  const dados: Record<Classe, Record<string, string>> = { a: {}, b: {}, c: {}, d: {} };
  let atual: Classe | null = null;
  let pendentes: { k: string; cls: Classe }[] = [];

  for (let i = ini; i < fim; i++) {
    const raw = brutas[i];
    const n = nrm[i];
    if (ehParagrafo(raw)) {
      pendentes = [];
      continue;
    }
    const mCls = n.match(/^residuos classe ([a-d])/);
    if (mCls) {
      atual = mCls[1] as Classe;
      pendentes = [];
      continue;
    }
    const ci = raw.indexOf(":");
    if (ci >= 0) {
      const esq = norm(raw.slice(0, ci + 1));
      const dir = raw.slice(ci + 1).trim();
      const k = mapa.get(esq);
      if (!k) continue;
      if (dir === "") {
        if (atual) pendentes.push({ k, cls: atual });
      } else if (atual) {
        dados[atual][k] = dir;
      }
      continue;
    }
    if (pendentes.length) {
      const { k, cls } = pendentes.shift()!;
      dados[cls][k] = raw;
    }
  }

  const linhas = DESTINACAO_ROWS.map((r) => ({
    id: r.id,
    empresa: dados[r.id].empresa ?? "",
    licenca: dados[r.id].licenca ?? "",
    endereco: dados[r.id].endereco ?? "",
    orgao: dados[r.id].orgao ?? "",
    municipio: dados[r.id].municipio ?? "",
    validade: dados[r.id].validade ?? "",
    indicacaoFiscal: dados[r.id].indicacaoFiscal ?? "",
  }));
  const temDado = linhas.some((l) => l.empresa || l.licenca || l.endereco || l.orgao || l.municipio);
  if (temDado) out.destinacao = linhas;
}

function extrairAssinatura(brutas: string[], out: Partial<PgrccIatFormData>): void {
  for (let i = brutas.length - 1; i >= 0; i--) {
    const m = brutas[i].match(RE_DATA_FINAL);
    if (m) {
      out.assinaturaCidade = m[1].trim();
      out.assinaturaDia = m[2];
      out.assinaturaMes = m[3];
      out.assinaturaAno = m[4];
      return;
    }
  }
}

export function extrairPgrccDoTexto(texto: string): Partial<PgrccIatFormData> {
  const brutas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
  const nrm = brutas.map(norm);
  const out: Partial<PgrccIatFormData> = {};

  const iEmpreendedor = acharInicio(nrm, (n) => n.includes("identificacao do empreendedor"));
  const f1e = janelaFim(nrm, iEmpreendedor, (n) => n.includes("identificacao da empresa ou profissional"));
  const iElabEmp = acharInicio(nrm, (n) => n.includes("identificacao da empresa ou profissional"));
  const f2e = janelaFim(nrm, iElabEmp, (n) => n.includes("identificacao e localizacao do empreendimento"));
  const iEmpreend = acharInicio(nrm, (n) => n.includes("identificacao e localizacao do empreendimento"));
  const f3e = janelaFim(nrm, iEmpreend, (n) => n.includes("responsaveis pelo gerenciamento"));
  const iRespElab = acharInicio(
    nrm,
    (n) => n.startsWith("elaboracao do projeto"),
    iEmpreend >= 0 ? iEmpreend : 0
  );
  const f4e = janelaFim(nrm, iRespElab, (n) => n.startsWith("implementacao do projeto"));
  const iRespImpl = acharInicio(
    nrm,
    (n) => n.startsWith("implementacao do projeto"),
    iRespElab >= 0 ? iRespElab : 0
  );
  const f5e = janelaFim(nrm, iRespImpl, (n) => n.startsWith("caracterizacao e quantificacao"));
  const iChar = acharInicio(
    nrm,
    (n) => n.startsWith("caracterizacao e quantificacao"),
    iRespImpl >= 0 ? iRespImpl : 0
  );
  const f6e = janelaFim(nrm, iChar, (n) => n.startsWith("reutilizacao ou reciclagem"));
  const iReutil = acharInicio(
    nrm,
    (n) => n.startsWith("reutilizacao ou reciclagem"),
    iChar >= 0 ? iChar : 0
  );
  const f7e = janelaFim(nrm, iReutil, (n) => n.startsWith("acondicionamento"));
  const iAcond = acharInicio(
    nrm,
    (n) => n.startsWith("acondicionamento"),
    iReutil >= 0 ? iReutil : 0
  );
  const f8e = janelaFim(nrm, iAcond, (n) => n.startsWith("transporte dos rcd"));
  const iTransp = acharInicio(
    nrm,
    (n) => n.startsWith("transporte dos rcd"),
    iAcond >= 0 ? iAcond : 0
  );
  const f9e = janelaFim(nrm, iTransp, (n) => n.startsWith("destinacao final dos rcd"));
  const iDest = acharInicio(
    nrm,
    (n) => n.startsWith("destinacao final dos rcd"),
    iTransp >= 0 ? iTransp : 0
  );
  const f10e = janelaFim(nrm, iDest, (n) => n.startsWith("plano de capacitacao"));

  extrairResponsaveisLegais(brutas, nrm, out);

  if (iEmpreendedor >= 0 && f1e > iEmpreendedor) {
    extrairGenerico(
      brutas,
      iEmpreendedor + 1,
      f1e,
      [
        ["Nome completo ou razão social:", "clienteRazaoSocial"],
        ["Nome fantasia:", "clienteNomeFantasia"],
        ["Endereço completo:", "clienteEndereco"],
        ["CPF / CNPJ:", "clienteCpfCnpj"],
        ["Telefone:", "clienteTelefone"],
        ["E-mail:", "clienteEmail"],
        ["e-mail:", "clienteEmail"],
      ],
      out
    );
  }

  if (iElabEmp >= 0 && f2e > iElabEmp) {
    extrairGenerico(
      brutas,
      iElabEmp + 1,
      f2e,
      [
        ["Razão social:", "elabRazaoSocial"],
        ["Endereço:", "elabEndereco"],
        ["CNPJ:", "elabCnpj"],
        ["Responsável legal:", "elabResponsavelLegal"],
        ["Telefone:", "elabTelefone"],
        ["E-mail:", "elabEmail"],
        ["e-mail:", "elabEmail"],
      ],
      out
    );
  }

  if (iEmpreend >= 0 && f3e > iEmpreend) {
    extrairGenerico(
      brutas,
      iEmpreend + 1,
      f3e,
      [
        ["Nome do empreendimento:", "empNome"],
        ["Nº da Indicação Fiscal:", "empIndicacaoFiscal"],
        ["Telefone:", "empTelefone"],
        ["E-mail:", "empEmail"],
        ["e-mail:", "empEmail"],
        ["Nº da Licença Prévia (LP):", "empLicencaPrevia"],
        ["Modalidade do empreendimento:", "empModalidade"],
        ["Rua:", "empRua"],
        ["nº:", "empNumero"],
        ["Bairro:", "empBairro"],
        ["Município:", "empMunicipio"],
        ["Caracterização do processo construtivo:", "empProcessoConstrutivo"],
        ["Metragem total a ser construída (em m²):", "empMetragem"],
      ],
      out
    );
  }

  if (iRespElab >= 0 && f4e > iRespElab) {
    extrairGenerico(
      brutas,
      iRespElab + 1,
      f4e,
      [
        ["Responsável técnico pela elaboração do PGRCC:", "respElabNome"],
        ["Conselho de classe e nº de registro:", "respElabConselho"],
        ["Nº da Anotação de Responsabilidade Técnica (ART):", "respElabArt"],
        ["Empresa responsável:", "respElabEmpresa"],
        ["Endereço:", "respElabEndereco"],
        ["Telefone:", "respElabTelefone"],
        ["E-mail:", "respElabEmail"],
        ["e-mail:", "respElabEmail"],
      ],
      out
    );
  }

  if (iRespImpl >= 0 && f5e > iRespImpl) {
    extrairResponsavelImplantacao(brutas, nrm, out);
    extrairGenerico(
      brutas,
      iRespImpl + 1,
      f5e,
      [
        ["Conselho de classe e nº de registro:", "respImplConselho"],
        ["Nº da Anotação de Responsabilidade Técnica (ART):", "respImplArt"],
        ["Empresa responsável:", "respImplEmpresa"],
        ["Endereço:", "respImplEndereco"],
        ["Telefone:", "respImplTelefone"],
        ["E-mail:", "respImplEmail"],
        ["e-mail:", "respImplEmail"],
      ],
      out
    );
  }

  if (iChar >= 0) extrairCaracterizacao(brutas, iChar + 1, f6e, out);
  if (iReutil >= 0) extrairReutilizacao(brutas, iReutil + 1, f7e, out);
  if (iAcond >= 0) extrairAcondicionamento(brutas, iAcond + 1, f8e, out);
  if (iTransp >= 0) extrairTransporte(brutas, iTransp + 1, f9e, out);
  if (iDest >= 0) extrairDestinacao(brutas, nrm, iDest + 1, f10e, out);

  extrairAssinatura(brutas, out);

  return out;
}
