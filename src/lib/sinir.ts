import { prisma } from "./prisma";
import { descriptografar } from "./crypto";
import { rgb } from "pdf-lib";

export const SINIR_API_BASE = "https://admin.sinir.gov.br/api";

export const SINIR_STATUS = {
  SALVO: "SALVO",
  EMITIDO: "EMITIDO",
  RECEBIDO: "RECEBIDO",
  CERTIFICADO: "CERTIFICADO",
  CANCELADO: "CANCELADO",
} as const;

export type SinirStatus = (typeof SINIR_STATUS)[keyof typeof SINIR_STATUS];

export interface SinirManifestoDados {
  numero: string;
  status: SinirStatus | string;
  certificado: boolean;
  cdfNumero?: string;
  clienteNome?: string;
  empreendNome?: string;
  transportadorNome?: string;
  destinadorNome?: string;
  resumo?: string;
  quantidade?: number;
  unidade?: string;
  dataExpedicao?: Date;
  dataRecebimento?: Date;
  classeRisco?: string;
  classeNome?: string;
  residuos?: Array<Record<string, unknown>>;
}

export interface SinirConexaoCompleta {
  id: number;
  nome: string;
  cnpj: string;
  unidade: string;
  token: string | null;
  modo: string;
  venceEm: Date | null;
  ativo: boolean;
  ultimoUsoEm: Date | null;
}

export interface EmitirManifestoResiduoInput {
  resCodigoIbama: string;
  marQuantidade: number;
  uniCodigo: number;
  tieCodigo: number;
  claCodigo: number;
  tiaCodigo: number;
  traCodigo: number;
  marDensidade?: number;
  marNumeroONU?: string;
  marClasseRisco?: string;
  marNomeEmbarque?: string;
  marGrupoEmbalagem?: string;
  marCodigoInterno?: string;
  marDescricaoInterna?: string;
  observacoes?: string;
}

export interface EmitirManifestoInput {
  conexaoId: number;
  clienteNome: string;
  empreendNome: string;
  resumo: string;
  quantidade: number;
  unidade: string;
  transportadorCnpj: string;
  transportadorUnidade: number;
  destinadorCnpj: string;
  destinadorUnidade: number;
  nomeResponsavel?: string;
  nomeMotorista?: string;
  placaVeiculo?: string;
  dataExpedicao?: number;
  observacoes?: string;
  residuos?: EmitirManifestoResiduoInput[];
}

export interface SinirCatalogos {
  residuos: { resCodigoIbama: string; resNome: string }[];
  unidades: { uniCodigo: number; uniNome: string; uniSigla: string }[];
  estadosFisicos: { tieCodigo: number; tieDescricao: string }[];
  classes: { claCodigo: number; claNome: string }[];
  acondicionamentos: { tiaCodigo: number; tiaDescricao: string }[];
  tratamentos: { traCodigo: number; traDescricao: string }[];
}

export class SinirError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function tokenReal(conexao: SinirConexaoCompleta): string {
  if (!conexao.token) throw new SinirError("Nenhum token cadastrado para esta conexão", 400);
  return descriptografar(conexao.token);
}

// Token de Acesso (8h) obtido a partir do Token de Integração via POST /token
const cacheTokenAcesso = new Map<number, { token: string; expiraEm: number }>();

function expDoJwt(jwt: string): number | null {
  try {
    const payload = jwt.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    const exp = Number(JSON.parse(json).exp);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

async function obterTokenAcesso(conexao: SinirConexaoCompleta): Promise<string> {
  const cacheado = cacheTokenAcesso.get(conexao.id);
  if (cacheado && cacheado.expiraEm > Date.now() + 60000) return cacheado.token;

  const tokenIntegracao = tokenReal(conexao);
  const res = await fetch(`${SINIR_API_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenIntegracao}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const dados = (await res.json().catch(() => ({}))) as {
    erro?: boolean;
    mensagem?: string;
    objetoResposta?: unknown;
  };

  if (res.status === 401 || dados.erro) {
    cacheTokenAcesso.delete(conexao.id);
    throw new SinirError(dados.mensagem || "Token de integração inválido, expirado ou revogado — gere um novo token no SINIR", 401);
  }
  if (!res.ok) {
    throw new SinirError(`Erro ao gerar token de acesso no SINIR (HTTP ${res.status})`, res.status);
  }

  const raw = typeof dados.objetoResposta === "string" ? dados.objetoResposta : "";
  const tokenAcesso = raw.replace(/^Bearer\s+/i, "").trim();
  if (!tokenAcesso) {
    throw new SinirError("O SINIR não retornou um token de acesso", 502);
  }

  const expMs = Math.min(expDoJwt(tokenAcesso) ?? Infinity, Date.now() + 30 * 60 * 1000);
  cacheTokenAcesso.set(conexao.id, { token: tokenAcesso, expiraEm: expMs });
  return tokenAcesso;
}

async function apiFetch(
  conexao: SinirConexaoCompleta,
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<unknown> {
  const url = new URL(`${SINIR_API_BASE}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v);
  }

  const enviar = async () => {
    const token = await obterTokenAcesso(conexao);
    return fetch(url.toString(), {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  };

  let res = await enviar();

  if (res.status === 401) {
    cacheTokenAcesso.delete(conexao.id);
    res = await enviar();
  }

  if (res.status === 401) {
    throw new SinirError("Token do SINIR expirado ou inválido — gere um novo token", 401);
  }
  if (res.status === 403) {
    throw new SinirError("Sem permissão do SINIR para esta operação — confira a unidade vinculada ao token", 403);
  }
  if (!res.ok) {
    const corpo = (await res.json().catch(() => ({}))) as {
      mensagem?: string;
      mensagemErroNacional?: string;
      erro?: boolean;
      objetoResposta?: unknown;
    };
    const msg =
      (typeof corpo.mensagem === "string" && corpo.mensagem.trim() ? corpo.mensagem : "") ||
      (typeof corpo.mensagemErroNacional === "string" && corpo.mensagemErroNacional.trim() ? corpo.mensagemErroNacional : "") ||
      `Erro do SINIR (HTTP ${res.status})`;
    throw new SinirError(msg, res.status);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Catálogos (resíduos, unidades, estados, classes, acondicionamento, tratamento) ----------

function listaDeResposta(resultado: unknown): unknown[] {
  const env = (resultado || {}) as { erro?: boolean; objeto?: unknown; objetoResposta?: unknown };
  if (Array.isArray(env.objetoResposta)) return env.objetoResposta;
  if (Array.isArray(env.objeto)) return env.objeto;
  if (Array.isArray(env)) return env as unknown[];
  return [];
}

const CATALOGOS_MOCK: SinirCatalogos = {
  residuos: [
    { resCodigoIbama: "150202", resNome: "Resíduo de construção civil — classe II B" },
    { resCodigoIbama: "A001", resNome: "Resíduo perigoso classe I" },
  ],
  unidades: [
    { uniCodigo: 1, uniNome: "Quilograma", uniSigla: "kg" },
    { uniCodigo: 2, uniNome: "Tonelada", uniSigla: "ton" },
    { uniCodigo: 3, uniNome: "Litro", uniSigla: "L" },
    { uniCodigo: 4, uniNome: "Metro cúbico", uniSigla: "m³" },
  ],
  estadosFisicos: [
    { tieCodigo: 1, tieDescricao: "Sólido" },
    { tieCodigo: 2, tieDescricao: "Líquido" },
    { tieCodigo: 3, tieDescricao: "Gasoso" },
    { tieCodigo: 4, tieDescricao: "Pastoso" },
  ],
  classes: [
    { claCodigo: 1, claNome: "Classe I - Perigosos" },
    { claCodigo: 2, claNome: "Classe II A - Não inertes" },
    { claCodigo: 3, claNome: "Classe II B - Inertes" },
  ],
  acondicionamentos: [
    { tiaCodigo: 1, tiaDescricao: "Container" },
    { tiaCodigo: 2, tiaDescricao: "Tambor" },
    { tiaCodigo: 3, tiaDescricao: "Bag" },
    { tiaCodigo: 4, tiaDescricao: "Granel" },
    { tiaCodigo: 5, tiaDescricao: "Bombona" },
  ],
  tratamentos: [
    { traCodigo: 1, traDescricao: "Aterro" },
    { traCodigo: 2, traDescricao: "Reciclagem" },
    { traCodigo: 3, traDescricao: "Incineração" },
    { traCodigo: 4, traDescricao: "Compostagem" },
    { traCodigo: 5, traDescricao: "Co-processamento" },
  ],
};

export async function listarCatalogos(conexao: SinirConexaoCompleta): Promise<SinirCatalogos> {
  const [residuosR, unidadesR, estadosR, classesR, acondR, tratR] = await Promise.all([
    apiFetch(conexao, "/retornaListaResiduo"),
    apiFetch(conexao, "/retornaListaUnidade"),
    apiFetch(conexao, "/retornaListaEstadoFisico"),
    apiFetch(conexao, "/retornaListaClasse"),
    apiFetch(conexao, "/retornaListaAcondicionamento"),
    apiFetch(conexao, "/retornaListaTratamento"),
  ]);

  const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const residuos = listaDeResposta(residuosR)
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { resCodigoIbama: str(o.resCodigoIbama || o.resCodigo), resNome: str(o.resNome || o.resDescricao || o.resCodigoIbama) };
    })
    .filter((r) => r.resCodigoIbama);

  const unidades = listaDeResposta(unidadesR)
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { uniCodigo: num(o.uniCodigo) ?? 0, uniNome: str(o.uniNome || o.uniDescricao), uniSigla: str(o.uniSigla) };
    })
    .filter((u) => u.uniCodigo > 0);

  const estadosFisicos = listaDeResposta(estadosR)
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { tieCodigo: num(o.tieCodigo) ?? 0, tieDescricao: str(o.tieDescricao || o.tieNome || o.descricao) };
    })
    .filter((e) => e.tieCodigo > 0);

  const classes = listaDeResposta(classesR)
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { claCodigo: num(o.claCodigo) ?? 0, claNome: str(o.claNome || o.claDescricao || o.descricao || o.nome) };
    })
    .filter((c) => c.claCodigo > 0);

  const acondicionamentos = listaDeResposta(acondR)
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { tiaCodigo: num(o.tiaCodigo) ?? 0, tiaDescricao: str(o.tiaDescricao || o.tiaNome || o.descricao) };
    })
    .filter((a) => a.tiaCodigo > 0);

  const tratamentos = listaDeResposta(tratR)
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { traCodigo: num(o.traCodigo) ?? 0, traDescricao: str(o.traDescricao || o.traNome || o.descricao) };
    })
    .filter((t) => t.traCodigo > 0);

  return {
    residuos: residuos.length ? residuos : CATALOGOS_MOCK.residuos,
    unidades: unidades.length ? unidades : CATALOGOS_MOCK.unidades,
    estadosFisicos: estadosFisicos.length ? estadosFisicos : CATALOGOS_MOCK.estadosFisicos,
    classes: classes.length ? classes : CATALOGOS_MOCK.classes,
    acondicionamentos: acondicionamentos.length ? acondicionamentos : CATALOGOS_MOCK.acondicionamentos,
    tratamentos: tratamentos.length ? tratamentos : CATALOGOS_MOCK.tratamentos,
  };
}

// ---------- Verificação (certificados vs pendentes) ----------

interface ParceiroLista {
  cpfCnpj?: string;
  nome?: string;
  unidade?: string;
}

function extrairParceiro(obj: unknown): ParceiroLista {
  if (!obj || typeof obj !== "object") return {};
  const o = obj as Record<string, unknown>;
  return {
    cpfCnpj: typeof o.parCnpj === "string" ? o.parCnpj : typeof o.cpfCnpj === "string" ? o.cpfCnpj : typeof o.cnpj === "string" ? o.cnpj : undefined,
    nome: typeof o.parDescricao === "string" ? o.parDescricao : typeof o.nome === "string" ? o.nome : typeof o.razaoSocial === "string" ? o.razaoSocial : undefined,
    unidade: typeof o.uniCodigo === "number" ? String(o.uniCodigo) : typeof o.parCodigo === "number" ? String(o.parCodigo) : typeof o.unidade === "string" ? o.unidade : undefined,
  };
}

function numeroString(v: unknown): string | undefined {
  if (v == null) return undefined;
  return String(v);
}

function dataDeMs(v: unknown): Date | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (n > 1e12) return new Date(n);
  return new Date(n * 1000);
}

function statusDeManifestoReal(obj: Record<string, unknown>): { status: SinirStatus | string; certificado: boolean } {
  const sim = (obj.situacaoManifesto || {}) as { simDescricao?: string; simCodigo?: number };
  const s = String(sim.simDescricao || obj.manSituacao || obj.situacao || obj.status || "").toUpperCase();
  const temCodigoCdf = [obj.cdfCodigo, obj.cdfNumero, obj.cdfEmitidoNumero].some((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  });
  const certificado = temCodigoCdf || String(obj.manCertificado || "").toUpperCase() === "S";

  let status: SinirStatus | string;
  if (s.includes("CANCEL")) status = SINIR_STATUS.CANCELADO;
  else if (s.includes("RECEB") || sim.simCodigo === 3) status = SINIR_STATUS.RECEBIDO;
  else if (s.includes("SALVO") || sim.simCodigo === 1) status = SINIR_STATUS.SALVO;
  else if (sim.simCodigo === 9) status = "ARMAZ_TEMPORARIO";
  else status = SINIR_STATUS.EMITIDO;

  return { status, certificado };
}

async function listarManifestosReais(
  conexao: SinirConexaoCompleta,
  dataInicial: string,
  dataFinal: string,
  tipoParceiro: number
): Promise<SinirManifestoDados[]> {
  const manifestos: SinirManifestoDados[] = [];
  const size = 100;
  let page = 0;

  for (;;) {
    const resultado = await apiFetch(conexao, "/listaManifesto", {
      method: "POST",
      body: { dataInicial, dataFinal, tipoParceiro },
      query: { page: String(page), size: String(size) },
    });

    const env = (resultado || {}) as { erro?: boolean; mensagem?: string; objetoResposta?: unknown; totalRecords?: number };
    if (env.erro) throw new SinirError(env.mensagem || "Falha ao listar manifestos no SINIR", 500);

    const lista = Array.isArray(env.objetoResposta)
      ? env.objetoResposta
      : Array.isArray(env)
        ? (env as unknown[])
        : [];

    for (const item of lista) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const numero = numeroString(obj.manNumero || obj.manifestoNumeroNacional || obj.manNumeroNacional);
      if (!numero) continue;

      const { status, certificado } = statusDeManifestoReal(obj);
      const gerador = extrairParceiro(obj.parceiroGerador || obj.gerador || obj.dadosGerador);
      const transportador = extrairParceiro(obj.parceiroTransportador || obj.transportador);
      const destinador = extrairParceiro(obj.parceiroDestinador || obj.destinador);
      const residuos = Array.isArray(obj.listaManifestoResiduo) ? (obj.listaManifestoResiduo as Record<string, unknown>[]) : [];
      const resumoResiduo = residuos
        .map((r) => (typeof r.marDescricaoInterna === "string" ? r.marDescricaoInterna : null))
        .filter((v): v is string => Boolean(v))
        .join("; ");

      // A classe vem aninhada em listaManifestoResiduo[].classe (quando o endpoint retorna)
      const identClasse = classeDeResiduos(residuos);
      const classeNome = identClasse.letra || "Não identificado";

      manifestos.push({
        numero,
        status,
        certificado,
        cdfNumero: extrairCdfNumero(obj),
        clienteNome: gerador.nome || numeroString(obj.clienteNome),
        empreendNome: typeof obj.empreendimento === "string" ? obj.empreendimento : numeroString(obj.empreendNome),
        transportadorNome: transportador.nome || numeroString(obj.transportadorNome),
        destinadorNome: destinador.nome || numeroString(obj.destinadorNome),
        resumo: typeof obj.resumoResiduos === "string" ? obj.resumoResiduos : resumoResiduo || numeroString(obj.resumo || obj.manObservacao),
        quantidade: typeof obj.manQuantidade === "number" ? obj.manQuantidade : residuos[0] && typeof residuos[0].marQuantidade === "number" ? residuos[0].marQuantidade : undefined,
        unidade: numeroString(obj.uniCodigo || obj.unidade),
        dataExpedicao: dataDeMs(obj.dataExpedicao || obj.manDataExpedicao || obj.manData),
        dataRecebimento: dataDeMs(obj.dataRecebimento || obj.manDataRecebimento || obj.manDataRecebimentoArmazenamentoTemporario),
    classeRisco: numeroString(
      ((residuos[0] as Record<string, unknown> | undefined)?.residuo as Record<string, unknown> | undefined)?.resCodigoIbama
    ) || numeroString(obj.marClasseRisco || obj.classeRisco),
        classeNome,
        residuos,
      });
    }

    const total = typeof env.totalRecords === "number" ? env.totalRecords : undefined;
    page += 1;
    if (lista.length < size) break;
    if (total != null && page * size >= total) break;
    if (page > 50) break;
  }

  return manifestos;
}

// Papéis em que a empresa cadastrada pode constar no MTR (conforme doc do SINIR)
export const SINIR_TIPOS_PARCEIRO = [
  { valor: 8, rotulo: "Gerador" },
  { valor: 5, rotulo: "Transportador" },
  { valor: 9, rotulo: "Destinador" },
  { valor: 10, rotulo: "Armazenador Temporário" },
];

export async function consultarManifestosTodasFuncoes(
  conexao: SinirConexaoCompleta,
  opts: { dataInicial: string; dataFinal: string }
): Promise<SinirManifestoDados[]> {
  const [dI, dF] = [parseDataDm(opts.dataInicial), parseDataDm(opts.dataFinal)];
  if (isNaN(dI.getTime()) || isNaN(dF.getTime()) || dI > dF) {
    throw new SinirError("Período de consulta inválido", 400);
  }

  const janelas: { inicio: string; fim: string }[] = [];
  let cursor = new Date(dI);
  while (cursor <= dF) {
    const fimJanela = new Date(Math.min(cursor.getTime() + 29 * 86400000, dF.getTime()));
    janelas.push({ inicio: fmtDataDm(cursor), fim: fmtDataDm(fimJanela) });
    cursor = new Date(fimJanela.getTime() + 86400000);
  }

  const porNumero = new Map<string, SinirManifestoDados>();
  for (const tipo of SINIR_TIPOS_PARCEIRO) {
    for (const janela of janelas) {
      const lista = await listarManifestosReais(conexao, janela.inicio, janela.fim, tipo.valor);
      for (const m of lista) porNumero.set(m.numero, m);
    }
  }

  return [...porNumero.values()];
}

export async function consultarTodosManifestos(
  conexao: SinirConexaoCompleta,
  opts: { dataInicial: string; dataFinal: string }
): Promise<SinirManifestoDados[]> {
  const [dI, dF] = [parseDataDm(opts.dataInicial), parseDataDm(opts.dataFinal)];
  if (isNaN(dI.getTime()) || isNaN(dF.getTime()) || dI > dF) {
    throw new SinirError("Período de consulta inválido", 400);
  }

  return consultarManifestosTodasFuncoes(conexao, { dataInicial: fmtDataDm(dI), dataFinal: fmtDataDm(dF) });
}

function fmtDataDm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function parseDataDm(s: string): Date {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return new Date(NaN);
}

export async function verificarManifestos(
  conexao: SinirConexaoCompleta,
  opts: { dataInicial: string; dataFinal: string; tipoParceiro?: number }
): Promise<SinirManifestoDados[]> {
  const tipoParceiro = opts.tipoParceiro ?? 1;
  const [dI, dF] = [parseDataDm(opts.dataInicial), parseDataDm(opts.dataFinal)];
  if (isNaN(dI.getTime()) || isNaN(dF.getTime()) || dI > dF) {
    throw new SinirError("Período de verificação inválido", 400);
  }

  return listarManifestosReais(conexao, fmtDataDm(dI), fmtDataDm(dF), tipoParceiro);
}

// ---------- Consulta individual ----------

export async function consultarManifesto(
  conexao: SinirConexaoCompleta,
  numero: string
): Promise<SinirManifestoDados | null> {
  if (!numero) throw new SinirError("Número do manifesto é obrigatório", 400);

  const resultado = await apiFetch(conexao, `/retornaManifesto/${encodeURIComponent(numero)}`);
  const env = (resultado || {}) as { erro?: boolean; mensagem?: string; objeto?: unknown };
  if (env.erro) throw new SinirError(env.mensagem || "Manifesto não encontrado no SINIR", 404);

  const obj = (env.objeto || env) as Record<string, unknown>;
  const { status, certificado } = statusDeManifestoReal(obj);
const gerador = extrairParceiro(obj.parceiroGerador || obj.gerador || obj.dadosGerador);
      const transportador = extrairParceiro(obj.parceiroTransportador || obj.transportador);
      const destinador = extrairParceiro(obj.parceiroDestinador || obj.destinador);
      const residuos = Array.isArray(obj.listaManifestoResiduo) ? (obj.listaManifestoResiduo as Record<string, unknown>[]) : [];

      // A classe vem aninhada em listaManifestoResiduo[].classe.claCodigo
      let classeNome = "Não identificado";
      for (const r of residuos) {
        const classe = ((r as Record<string, unknown>)?.classe || {}) as Record<string, unknown>;
        const claCodigo = num(classe.claCodigo);
        if (claCodigo != null && MAPA_CLASSE_LETRA[claCodigo]) {
          classeNome = MAPA_CLASSE_LETRA[claCodigo];
          break;
        }
        const desc = String(classe.claDescricao || "").toUpperCase();
        if (desc.includes("CLASSE I") && !desc.includes("II")) { classeNome = "A"; break; }
        if (desc.includes("II A") || desc.includes("II-A")) { classeNome = "B"; break; }
        if (desc.includes("II B") || desc.includes("II-B")) { classeNome = "C"; break; }
      }

  return {
    numero: numeroString(obj.manNumero) || numero,
    status,
    certificado,
    cdfNumero: extrairCdfNumero(obj),
    clienteNome: gerador.nome || numeroString(obj.clienteNome),
    empreendNome: typeof obj.empreendimento === "string" ? obj.empreendimento : numeroString(obj.empreendNome),
    transportadorNome: transportador.nome || numeroString(obj.transportadorNome),
    destinadorNome: destinador.nome || numeroString(obj.destinadorNome),
    resumo: typeof obj.resumoResiduos === "string" ? obj.resumoResiduos : numeroString(obj.resumo || obj.manObservacao),
    quantidade: typeof obj.manQuantidade === "number" ? obj.manQuantidade : undefined,
    unidade: numeroString(obj.uniCodigo || obj.unidade),
    dataExpedicao: dataDeMs(obj.dataExpedicao || obj.manDataExpedicao || obj.manData),
    dataRecebimento: dataDeMs(obj.dataRecebimento || obj.manDataRecebimento || obj.manDataRecebimentoArmazenamentoTemporario),
    classeRisco:
      numeroString(
        ((Array.isArray(obj.listaManifestoResiduo) ? (obj.listaManifestoResiduo as Record<string, unknown>[])[0] : undefined)?.residuo as
          | Record<string, unknown>
          | undefined)?.resCodigoIbama
      ) || numeroString(obj.marClasseRisco || obj.classeRisco),
    classeNome,
    residuos: Array.isArray(obj.listaManifestoResiduo) ? obj.listaManifestoResiduo : undefined,
  };
}

// ---------- Emissão ----------

export async function emitirManifesto(
  conexao: SinirConexaoCompleta,
  input: EmitirManifestoInput
): Promise<{ numero: string }> {
  if (!input.resumo || !input.quantidade) {
    throw new SinirError("Resumo do resíduo e quantidade são obrigatórios", 400);
  }
  if (!/^\d{14}$/.test(input.transportadorCnpj || "") || !/^\d{14}$/.test(input.destinadorCnpj || "")) {
    throw new SinirError("CNPJ do transportador e do destinador devem ter 14 dígitos", 400);
  }

  const residuos = input.residuos?.length
    ? input.residuos
    : [
        {
          resCodigoIbama: "150202",
          marQuantidade: input.quantidade,
          uniCodigo: 2,
          tieCodigo: 4,
          claCodigo: 1,
          tiaCodigo: 5,
          traCodigo: 4,
          marDescricaoInterna: input.resumo,
          marCodigoInterno: "",
        },
      ];

  if (!input.transportadorUnidade || !input.destinadorUnidade) {
    throw new SinirError("Informe o código da unidade do transportador e do destinador (visível no portal SINIR, módulo DMR)", 400);
  }

  const resultado = await apiFetch(conexao, "/salvarManifestoLote", {
    method: "POST",
    body: [
      {
        possuiArmazenamentoTemporario: false,
        nomeResponsavel: input.nomeResponsavel || "Responsavel Tecnico",
        gerador: { cpfCnpj: conexao.cnpj, unidade: Number(conexao.unidade) || conexao.unidade },
        transportador: { cpfCnpj: input.transportadorCnpj, unidade: input.transportadorUnidade },
        destinador: { cpfCnpj: input.destinadorCnpj, unidade: input.destinadorUnidade },
        nomeMotorista: input.nomeMotorista || null,
        placaVeiculo: input.placaVeiculo || null,
        dataExpedicao: input.dataExpedicao || Date.now(),
        observacoes: input.observacoes || input.resumo,
        tipoManifesto: 0,
        listaManifestoResiduos: residuos,
      },
    ],
  });

  const env = (resultado || {}) as {
    erroNacional?: boolean;
    mensagemErroNacional?: string;
    respostaApiwsManifestoDTO?: { codigoGerado?: number; manifestoNumeroNacional?: string; restResponseValido?: boolean; restResponseMensagem?: string }[];
  };

  const resp = Array.isArray(env.respostaApiwsManifestoDTO) ? env.respostaApiwsManifestoDTO[0] : undefined;
  if (!resp?.restResponseValido || !resp.manifestoNumeroNacional) {
    throw new SinirError(resp?.restResponseMensagem || env.mensagemErroNacional || "SINIR não confirmou a emissão do MTR", 502);
  }

  await prisma.sinirManifesto.create({
    data: {
      conexaoId: conexao.id,
      numero: resp.manifestoNumeroNacional,
      status: SINIR_STATUS.EMITIDO,
      certificado: false,
      clienteNome: input.clienteNome,
      empreendNome: input.empreendNome,
      resumo: input.resumo,
      quantidade: input.quantidade,
      unidade: input.unidade,
      dataExpedicao: new Date(),
    },
  });

  return { numero: resp.manifestoNumeroNacional };
}

// ---------- Download ----------

async function erroDownload(res: Response, fallback: string): Promise<SinirError> {
  let texto = "";
  try {
    texto = new TextDecoder().decode(new Uint8Array(await res.arrayBuffer())).trim();
  } catch {
    // corpo ilegível
  }
  const corpo = (() => {
    try {
      return JSON.parse(texto) as { mensagem?: string; mensagemErroNacional?: string; error?: string; message?: string };
    } catch {
      return null;
    }
  })();
  const detalhe =
    (typeof corpo?.mensagem === "string" && corpo.mensagem.trim() && corpo.mensagem) ||
    (typeof corpo?.mensagemErroNacional === "string" && corpo.mensagemErroNacional.trim() && corpo.mensagemErroNacional) ||
    (typeof corpo?.error === "string" && corpo.error.trim() && corpo.error) ||
    (typeof corpo?.message === "string" && corpo.message.trim() && corpo.message) ||
    (texto ? texto.slice(0, 200) : "");
  return new SinirError(detalhe ? `SINIR: ${detalhe} (HTTP ${res.status})` : `${fallback} (HTTP ${res.status})`, res.status);
}

function ePdfValido(buffer: Uint8Array): boolean {
  return buffer.byteLength > 200 && String.fromCharCode(...buffer.slice(0, 5)) === "%PDF-";
}

async function fetchDownload(
  conexao: SinirConexaoCompleta,
  path: string,
  fallback: string,
  opts: { method?: string; accept?: string } = {}
): Promise<Response> {
  const enviar = async () => {
    const token = await obterTokenAcesso(conexao);
    return fetch(`${SINIR_API_BASE}${path}`, {
      method: opts.method || "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: opts.accept || "application/pdf" },
      cache: "no-store",
    });
  };

  let res = await enviar();
  if (res.status === 401) {
    cacheTokenAcesso.delete(conexao.id);
    res = await enviar();
  }
  if (!res.ok || (res.headers.get("content-type") || "").includes("application/json")) {
    throw await erroDownload(res, fallback);
  }
  return res;
}

export async function baixarManifestoPdf(
  conexao: SinirConexaoCompleta,
  numero: string
): Promise<{ buffer: Uint8Array; filename: string }> {
  if (!numero) throw new SinirError("Número do manifesto é obrigatório", 400);

  const res = await fetchDownload(conexao, `/downloadManifesto/${encodeURIComponent(numero)}`, "Erro ao baixar PDF do MTR");

  const buffer = new Uint8Array(await res.arrayBuffer());
  if (!ePdfValido(buffer)) {
    const amostra = new TextDecoder().decode(buffer.slice(0, 200)).trim();
    throw new SinirError(`O SINIR não retornou um PDF válido para este MTR${amostra ? ` — resposta: ${amostra}` : " (corpo vazio)"}`, 502);
  }
  return { buffer, filename: `MTR-${numero}.pdf` };
}

// ---------- Certificado de Destinação Final (CDF) ----------

export async function consultarCertificadoMtr(conexao: SinirConexaoCompleta, numero: string): Promise<number | null> {
  const dados = (await apiFetch(conexao, `/retornaManifesto/${encodeURIComponent(numero)}`)) as {
    erro?: boolean;
    mensagem?: string;
    objeto?: unknown;
    objetoResposta?: unknown;
  } | null;

  const alvo = ((dados?.objeto ?? dados?.objetoResposta) || null) as Record<string, unknown> | null;
  if (!alvo || typeof alvo !== "object") return null;

  for (const chave of ["cdfNumero", "cdfCodigo", "cdfEmitidoNumero", "certificadoCodigo", "codigoCertificado", "numeroCertificado", "cerCodigo"]) {
    const n = Number(alvo[chave]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const cert = alvo.certificado;
  if (cert && typeof cert === "object") {
    const c = cert as Record<string, unknown>;
    for (const chave of ["cdfNumero", "cdfCodigo", "codigo", "cerCodigo"]) {
      const n = Number(c[chave]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export async function baixarCertificadoPdf(
  conexao: SinirConexaoCompleta,
  cdfCodigo: number | string
): Promise<{ buffer: Uint8Array; filename: string }> {
  const codigo = String(cdfCodigo).trim();
  if (!codigo) throw new SinirError("Código do certificado é obrigatório", 400);

  const res = await fetchDownload(
    conexao,
    `/downloadCertificado/${encodeURIComponent(codigo)}?formato=pdf`,
    "Erro ao baixar o CDF do SINIR",
    { method: "POST", accept: "*/*" }
  );

  const buffer = new Uint8Array(await res.arrayBuffer());
  if (!ePdfValido(buffer)) {
    const amostra = new TextDecoder().decode(buffer.slice(0, 200)).trim();
    throw new SinirError(`O SINIR não retornou um PDF válido para este CDF${amostra ? ` — resposta: ${amostra}` : " (corpo vazio)"}`, 502);
  }
return { buffer, filename: `CDF-${codigo}.pdf` };
}

// ---------- Cancelamento ----------

export async function cancelarManifesto(
  conexao: SinirConexaoCompleta,
  numero: string,
  justificativa: string
): Promise<{ numero: string; simulacao: boolean }> {
  if (!numero || !justificativa.trim()) {
    throw new SinirError("Número do MTR e justificativa são obrigatórios", 400);
  }

  const existente = await prisma.sinirManifesto.findFirst({ where: { conexaoId: conexao.id, numero } });
  if (existente && existente.certificado) {
    throw new SinirError("MTR já certificado não pode ser cancelado", 400);
  }

  if (conexao.modo === "mock") {
    await prisma.sinirManifesto.updateMany({
      where: { conexaoId: conexao.id, numero },
      data: { status: SINIR_STATUS.CANCELADO, justificativa, dataCancelamento: new Date(), certificado: false },
    });
    return { numero, simulacao: true };
  }

  await apiFetch(conexao, "/cancelarManifesto", {
    method: "POST",
    body: { manNumero: numero, justificativa },
  });

  await prisma.sinirManifesto.updateMany({
    where: { conexaoId: conexao.id, numero },
    data: { status: SINIR_STATUS.CANCELADO, justificativa, dataCancelamento: new Date(), certificado: false },
  });

  return { numero, simulacao: false };
}

// ---------- Identificação de Classe a partir dos resíduos do manifesto ----------

// Tabela oficial de classes do SINIR (claCodigo -> letra do relatório)
const MAPA_CLASSE_LETRA: Record<number, string> = {
  1: "A", // CLASSE I - Perigosos (NBR 10.004)
  2: "D", // OUTROS
  11: "A", // CLASSE A (RCC)
  12: "B", // CLASSE B (RCC)
  13: "C", // CLASSE C (RCC)
  14: "D", // CLASSE D (RCC)
  21: "A", // GRUPO A1 (RSS)
  22: "A", // GRUPO A2 (RSS)
  23: "A", // GRUPO A3 (RSS)
  24: "A", // GRUPO A4 (RSS)
  25: "A", // GRUPO A5 (RSS)
  32: "B", // GRUPO B (RSS)
  33: "C", // GRUPO C (RSS)
  34: "D", // GRUPO D (RSS)
  35: "D", // GRUPO E (RSS)
  41: "A", // GRUPO A (RSS)
  42: "C", // CLASSE II B - Inertes (NBR 10.004)
  43: "B", // CLASSE II A - Não inertes (NBR 10.004)
};

export interface ClasseIdentificada {
  letra: string;
  descricaoSinir: string;
  resCodigoIbama: string;
  resDescricao: string;
}

// Extrai o número do CDF emitido (código > 0 indica CDF existente)
export function extrairCdfNumero(obj: Record<string, unknown>): string | undefined {
  for (const candidato of [obj.cdfNumero, obj.cdfCodigo, obj.cdfEmitidoNumero]) {
    if (candidato == null) continue;
    const n = Number(candidato);
    if (Number.isFinite(n)) {
      if (n > 0) return String(n);
      continue;
    }
    const s = String(candidato).trim();
    if (s) return s;
  }
  return undefined;
}

export function classeDeResiduos(residuos: unknown): ClasseIdentificada {
  const lista = Array.isArray(residuos) ? residuos : [];
  for (const r of lista) {
    const item = (r || {}) as Record<string, unknown>;
    const residuo = (item.residuo || {}) as Record<string, unknown>;
    const classe = (item.classe || {}) as Record<string, unknown>;

    const claCodigo = num(classe.claCodigo);
    const claDescricao = String(classe.claDescricao || "").trim();
    const resCodigoIbama = String(residuo.resCodigoIbama || "").trim();
    const resDescricao = String(residuo.resDescricao || "").trim();

    let letra = "";
    if (claCodigo != null && MAPA_CLASSE_LETRA[claCodigo]) letra = MAPA_CLASSE_LETRA[claCodigo];
    else {
      const d = claDescricao.toUpperCase();
      if (d.includes("CLASSE I") && !d.includes("II")) letra = "A";
      else if (d.includes("II A") || d.includes("II-A")) letra = "B";
      else if (d.includes("II B") || d.includes("II-B")) letra = "C";
      else if (/CLASSE A\b|GRUPO A/.test(d)) letra = "A";
      else if (/CLASSE B\b|GRUPO B/.test(d)) letra = "B";
      else if (/CLASSE C\b|GRUPO C/.test(d)) letra = "C";
      else if (/CLASSE D\b|GRUPO [DE]/.test(d)) letra = "D";
    }

    if (letra) {
      return { letra, descricaoSinir: claDescricao || "Sem descrição", resCodigoIbama, resDescricao };
    }
  }
  return { letra: "", descricaoSinir: "", resCodigoIbama: "", resDescricao: "" };
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- DMR (relatório no modelo do SINIR) ----------

export interface DmrDeclarante {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  municipio?: string | null;
  uf?: string | null;
}

export interface DmrLinha {
  numero: string;
  resumo: string | null;
  quantidade: number | null;
  unidade: string | null;
  status: string;
  certificado: boolean;
  dataExpedicao: Date | null;
}

export async function gerarPdfDmr(
  declarante: DmrDeclarante,
  periodo: { ano: number; trimestre: number },
  linhas: DmrLinha[]
): Promise<{ buffer: Uint8Array; nomeArquivo: string }> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const { embedNagalliLogo, drawNagalliTopo, drawNagalliFooter, PALETTE } = await import("./report-branding");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedNagalliLogo(pdf);
  const page = pdf.addPage([842, 595]);

  const topo = drawNagalliTopo(page, logo, font, bold);
  const ink900 = PALETTE.ink["900"];
  const ink700 = PALETTE.ink["700"];
  const ink500 = PALETTE.ink["500"];
  const brand700 = PALETTE.brand["700"];

  let y = topo - 30;

  page.drawText("DECLARAÇÃO DE MOVIMENTAÇÃO DE RESÍDUOS — DMR", { x: 40, y, size: 15, font: bold, color: brand700 });
  y -= 18;
  page.drawText(`Período: ${periodo.trimestre}º trimestre de ${periodo.ano} (modelo de referência do SINIR — conferência)`, { x: 40, y, size: 9, font, color: ink500 });
  y -= 8;
  page.drawText("O envio oficial é feito no portal mtr.sinir.gov.br", { x: 40, y, size: 8.5, font, color: ink500 });

  y -= 26;

  page.drawText("INFORMAÇÕES DO DECLARANTE", { x: 40, y, size: 9, font: bold, color: brand700 });
  y -= 16;

  const campo = (label: string, valor: string, largura = 360) => {
    page.drawText(label, { x: 40, y, size: 8, font: bold, color: ink500 });
    page.drawText(valor, { x: 40, y: y - 13, size: 10.5, font: bold, color: ink900, maxWidth: largura });
    y -= 38;
  };

  campo("RAZÃO SOCIAL", declarante.razaoSocial);
  campo("NOME FANTASIA", declarante.nomeFantasia || "—");
  campo("CNPJ", declarante.cnpj);
  campo("MUNICÍPIO / UF", `${declarante.municipio || "—"} / ${declarante.uf || "—"}`);

  y -= 6;
  page.drawRectangle({ x: 40, y, width: 762, height: 0.6, color: PALETTE.paper["200"] });
  y -= 16;

  page.drawText("RESÍDUOS MOVIMENTADOS NO PERÍODO", { x: 40, y, size: 9, font: bold, color: brand700 });
  y -= 16;

  const col = (text: string, size: number, x: number, w: number, c: ReturnType<typeof rgb> = ink900, f: typeof font = font) => {
    page.drawText(text, { x, y, size, font: f, color: c, maxWidth: w });
  };

  const headers: [string, number, number][] = [
    ["MTR", 40, 140],
    ["Resíduo", 140, 400],
    ["Quantidade", 540, 120],
    ["Situação", 660, 140],
  ];

  for (const [h, x, w] of headers) col(h, 8, x, w, ink500, bold);
  y -= 14;

  if (linhas.length === 0) {
    col("Sem movimentação de resíduos no período (declaração sem resíduos).", 9, 40, 760, ink700);
    y -= 16;
  }

  for (const l of linhas) {
    if (y < 80) {
      page.drawText("Continua na próxima página...", { x: 40, y, size: 8, font, color: ink500 });
      const nova = pdf.addPage([842, 595]);
      drawNagalliTopo(nova, logo, font, bold);
      y = 700;
    }
    const qtd = l.quantidade != null ? `${l.quantidade.toLocaleString("pt-BR")} ${l.unidade || ""}`.trim() : "—";
    col(l.numero, 9, 40, 140, ink900, bold);
    col(l.resumo || "—", 9, 140, 400);
    col(qtd, 9, 540, 120);
    col(l.certificado ? "Certificado" : l.status, 9, 660, 140, l.certificado ? PALETTE.brand["600"] : ink700);
    y -= 18;
  }

  y -= 8;
  page.drawRectangle({ x: 40, y, width: 762, height: 0.6, color: PALETTE.paper["200"] });
  y -= 18;

  const totalQtd = linhas.reduce((acc, l) => acc + (l.quantidade || 0), 0);
  page.drawText(`Total movimentado no período: ${totalQtd.toLocaleString("pt-BR")} ${linhas[0]?.unidade || ""}`.trim(), { x: 40, y, size: 10, font: bold, color: ink900 });
  y -= 22;

  drawNagalliFooter(page, font, bold);

  const bytes = await pdf.save();
  return { buffer: new Uint8Array(bytes), nomeArquivo: `DMR-${periodo.trimestre}T-${periodo.ano}.pdf` };
}

export interface MtrsSalvosPorDestinadorItem {
  numero: string;
  destinadorNome: string | null;
  dataExpedicao: Date | null;
}

export async function gerarPdfMtrsSalvosPorDestinador(
  empreendimentoNome: string,
  unidadeSinir: string | null,
  mtrs: MtrsSalvosPorDestinadorItem[],
  periodoRotulo?: string
): Promise<{ buffer: Uint8Array; nomeArquivo: string }> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const { embedNagalliLogo, drawNagalliTopo, drawNagalliFooter, PALETTE } = await import("./report-branding");

  const grupos = new Map<string, MtrsSalvosPorDestinadorItem[]>();
  for (const m of mtrs) {
    const chave = m.destinadorNome || "Destinador não identificado";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(m);
  }
  const ordenados = [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedNagalliLogo(pdf);
  let page = pdf.addPage([842, 595]);

  const topo = drawNagalliTopo(page, logo, font, bold);
  const ink900 = PALETTE.ink["900"];
  const ink700 = PALETTE.ink["700"];
  const ink500 = PALETTE.ink["500"];

  let y = topo - 24;

  page.drawText("RELAÇÃO DE MTRs SALVOS", { x: 40, y, size: 15, font: bold, color: ink900 });
  y -= 16;
  const subtitulo = periodoRotulo
    ? `Manifestos com situação "Salvo" no SINIR no período do ${periodoRotulo} — agrupados por destinador`
    : 'Manifestos com situação "Salvo" no SINIR — agrupados por destinador';
  page.drawText(subtitulo, {
    x: 40, y, size: 9, font, color: ink700,
  });
  y -= 12;
  const linhaInfo = `Empreendimento: ${empreendimentoNome}${unidadeSinir ? `   |   Unidade SINIR: ${unidadeSinir}` : ""}   |   Gerado em: ${new Date().toLocaleDateString("pt-BR")}`;
  page.drawText(linhaInfo, { x: 40, y, size: 9, font, color: ink500 });
  y -= 14;

  page.drawRectangle({ x: 40, y, width: 762, height: 0.6, color: PALETTE.paper["200"] });
  y -= 20;

  if (ordenados.length === 0) {
    page.drawText("Nenhum MTR na situação Salvo para este empreendimento.", { x: 40, y, size: 10, font, color: ink700 });
  }

  const novaPagina = () => {
    const p = pdf.addPage([842, 595]);
    drawNagalliTopo(p, logo, font, bold);
    return { p, y: topo - 16 };
  };

  for (const [destinador, lista] of ordenados) {
    if (y < 110) ({ p: page, y } = novaPagina());

    page.drawRectangle({ x: 40, y: y - 4, width: 762, height: 18, color: PALETTE.brand["50"] });
    page.drawText(`DESTINADOR: ${destinador.toUpperCase()}`, { x: 48, y, size: 11, font: bold, color: PALETTE.brand["700"] });
    y -= 22;

    for (const m of lista) {
      if (y < 70) ({ p: page, y } = novaPagina());
      page.drawCircle({ x: 46, y: y + 3, size: 1.6, color: PALETTE.brand["600"] });
      page.drawText(`MTR ${m.numero}`, { x: 56, y, size: 9.5, font: bold, color: ink900 });
      const dataTxt = m.dataExpedicao ? `— emitido em ${m.dataExpedicao.toLocaleDateString("pt-BR")}` : "— data de emissão não registrada";
      page.drawText(dataTxt, { x: 220, y, size: 9.5, font, color: ink700 });
      y -= 17;
    }
    y -= 12;
  }

  drawNagalliFooter(page, font, bold);

  const bytes = await pdf.save();
  const slug = empreendimentoNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return {
    buffer: new Uint8Array(bytes),
    nomeArquivo: `mtrs-salvos-${slug || "empreendimento"}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

export interface MtrPorClasseItem {
  numero: string;
  classeRisco: string;
  classeNome: string;
  dataExpedicao: Date | null;
  destinadorNome: string | null;
  resDescricao?: string | null;
  descricaoSinir?: string | null;
  quantidade?: number | null;
  unidade?: string | null;
}

const SECOES_CLASSE: { letra: string; titulo: string; subtitulo: string }[] = [
  { letra: "A", titulo: "CLASSE A", subtitulo: "Resíduos perigosos — Classe I (NBR 10.004), RCC Classe A e RSS Grupo A" },
  { letra: "B", titulo: "CLASSE B", subtitulo: "Não inertes — Classe II A (NBR 10.004), RCC Classe B e RSS Grupo B" },
  { letra: "C", titulo: "CLASSE C", subtitulo: "Inertes — Classe II B (NBR 10.004), RCC Classe C e RSS Grupo C" },
  { letra: "D", titulo: "CLASSE D", subtitulo: "Outros — RCC Classes D, RSS Grupos D/E e resíduos não especificados" },
];

export async function gerarPdfMtrsPorClasse(
  empreendimentoNome: string,
  unidadeSinir: string | null,
  mtrs: MtrPorClasseItem[]
): Promise<{ buffer: Uint8Array; nomeArquivo: string }> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const { embedNagalliLogo, drawNagalliTopo, drawNagalliFooter, PALETTE } = await import("./report-branding");

  const gruposPorLetra = new Map<string, MtrPorClasseItem[]>();
  for (const letra of ["A", "B", "C", "D"]) gruposPorLetra.set(letra, []);
  for (const m of mtrs) {
    const letra = (m.classeNome || "").toUpperCase().replace(/[^ABCD]/g, "").charAt(0);
    if (letra && gruposPorLetra.has(letra)) gruposPorLetra.get(letra)!.push(m);
    else gruposPorLetra.get("D")!.push(m);
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedNagalliLogo(pdf);
  let page = pdf.addPage([842, 595]);

  const topo = drawNagalliTopo(page, logo, font, bold);
  const ink900 = PALETTE.ink["900"];
  const ink700 = PALETTE.ink["700"];
  const ink500 = PALETTE.ink["500"];

  let y = topo - 24;

  page.drawText("RELATÓRIO DE MTRs POR CLASSE DE RESÍDUO", { x: 40, y, size: 15, font: bold, color: ink900 });
  y -= 16;
  page.drawText("Classificação conforme catálogo SINIR/NBR 10.004/CONAMA 307 — classes A, B, C e D", {
    x: 40, y, size: 9, font, color: ink700,
  });
  y -= 12;
  const linhaInfo = `Empreendimento: ${empreendimentoNome}${unidadeSinir ? `   |   Unidade SINIR: ${unidadeSinir}` : ""}   |   Gerado em: ${new Date().toLocaleDateString("pt-BR")}   |   Total de MTRs: ${mtrs.length}`;
  page.drawText(linhaInfo, { x: 40, y, size: 9, font, color: ink500 });
  y -= 14;

  page.drawRectangle({ x: 40, y, width: 762, height: 0.6, color: PALETTE.paper["200"] });
  y -= 20;

  const novaPagina = () => {
    const p = pdf.addPage([842, 595]);
    drawNagalliTopo(p, logo, font, bold);
    return { p, y: topo - 16 };
  };

  for (const secao of SECOES_CLASSE) {
    if (y < 110) ({ p: page, y } = novaPagina());

    const lista = gruposPorLetra.get(secao.letra)!;

    page.drawRectangle({ x: 40, y: y - 4, width: 762, height: 20, color: PALETTE.brand["600"] });
    page.drawText(`${secao.titulo} — ${lista.length} MTR(s)`, {
      x: 48, y: y + 2, size: 11.5, font: bold, color: PALETTE.paper["50"],
    });
    y -= 14;
    page.drawText(secao.subtitulo, { x: 48, y, size: 8, font, color: ink500 });
    y -= 16;

    if (lista.length === 0) {
      page.drawText("Nenhum MTR nesta classe.", { x: 56, y, size: 9, font, color: ink700 });
      y -= 20;
    } else {
      for (const m of lista) {
        if (y < 70) ({ p: page, y } = novaPagina());
        page.drawCircle({ x: 46, y: y + 3, size: 1.6, color: PALETTE.brand["600"] });
        page.drawText(`MTR ${m.numero}`, { x: 56, y, size: 9.5, font: bold, color: ink900 });

        const partes: string[] = [];
        partes.push(m.dataExpedicao ? `emitido em ${m.dataExpedicao.toLocaleDateString("pt-BR")}` : "data não registrada");
        if (m.destinadorNome) partes.push(`destinador: ${m.destinadorNome}`);
        if (m.quantidade != null) partes.push(`qtd: ${m.quantidade.toLocaleString("pt-BR")} ${m.unidade || ""}`.trim());
        if (m.resDescricao) partes.push(`resíduo: ${m.resDescricao}`);
        else if (m.descricaoSinir) partes.push(m.descricaoSinir);

        let linha = partes.join("  |  ");
        if (linha.length > 118) linha = `${linha.slice(0, 115)}...`;
        page.drawText(linha, { x: 150, y, size: 8.5, font, color: ink700 });
        y -= 17;
      }
      y -= 10;
    }
  }

  drawNagalliFooter(page, font, bold);

  const bytes = await pdf.save();
  const slug = empreendimentoNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return {
    buffer: new Uint8Array(bytes),
    nomeArquivo: `mtrs-por-classe-${slug || "empreendimento"}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}