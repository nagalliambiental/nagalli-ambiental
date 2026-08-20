import { prisma } from "./prisma";
import { descriptografar } from "./crypto";

export const SINIR_API_BASE = "https://admin.sinir.gov.br/api";

export const SINIR_STATUS = {
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
  resumo?: string;
  quantidade?: number;
  unidade?: string;
  dataExpedicao?: Date;
  dataRecebimento?: Date;
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

export interface EmitirManifestoInput {
  conexaoId: number;
  clienteNome: string;
  empreendNome: string;
  resumo: string;
  quantidade: number;
  unidade: string;
  transportadorCnpj: string;
  destinadorCnpj: string;
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

async function apiFetch(
  conexao: SinirConexaoCompleta,
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<unknown> {
  const token = tokenReal(conexao);
  const url = new URL(`${SINIR_API_BASE}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new SinirError("Token do SINIR expirado ou inválido — gere um novo token", 401);
  }
  if (res.status === 403) {
    throw new SinirError("Sem permissão do SINIR para esta operação — confira a unidade vinculada ao token", 403);
  }
  if (!res.ok) {
    throw new SinirError(`Erro do SINIR (HTTP ${res.status})`, res.status);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
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
    cpfCnpj: typeof o.cpfCnpj === "string" ? o.cpfCnpj : typeof o.cnpj === "string" ? o.cnpj : undefined,
    nome: typeof o.nome === "string" ? o.nome : typeof o.razaoSocial === "string" ? o.razaoSocial : undefined,
    unidade: typeof o.unidade === "string" ? o.unidade : typeof o.uniCodigo === "number" ? String(o.uniCodigo) : undefined,
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

function statusDeManifestoReal(obj: Record<string, unknown>): { status: SinirStatus | string; certificado: boolean; cdfNumero?: string } {
  const s = String(obj.manSituacao || obj.situacao || obj.status || "").toUpperCase();
  const temCdf = obj.cdfCodigo != null || obj.cdfNumero != null || String(obj.manCertificado || "").toUpperCase() === "S";

  if (s.includes("CANCEL")) return { status: SINIR_STATUS.CANCELADO, certificado: false };
  if (temCdf || s.includes("CERTIF")) return { status: SINIR_STATUS.CERTIFICADO, certificado: true, cdfNumero: numeroString(obj.cdfNumero || obj.cdfCodigo) };
  if (s.includes("RECEB")) return { status: SINIR_STATUS.RECEBIDO, certificado: false };
  return { status: SINIR_STATUS.EMITIDO, certificado: false };
}

async function listarManifestosReais(
  conexao: SinirConexaoCompleta,
  dataInicial: string,
  dataFinal: string,
  tipoParceiro: number
): Promise<SinirManifestoDados[]> {
  const resultado = await apiFetch(conexao, "/listaManifesto", {
    method: "POST",
    body: { dataInicial, dataFinal, tipoParceiro },
    query: { page: "0", size: "100" },
  });

  const env = (resultado || {}) as { erro?: boolean; mensagem?: string; objetoResposta?: unknown; totalRecords?: number };
  if (env.erro) throw new SinirError(env.mensagem || "Falha ao listar manifestos no SINIR", 500);

  const lista = Array.isArray(env.objetoResposta)
    ? env.objetoResposta
    : Array.isArray(env)
      ? (env as unknown[])
      : [];

  const manifestos: SinirManifestoDados[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const numero = numeroString(obj.manNumero || obj.manifestoNumeroNacional || obj.manNumeroNacional);
    if (!numero) continue;

    const { status, certificado, cdfNumero } = statusDeManifestoReal(obj);
    const gerador = extrairParceiro(obj.gerador || obj.dadosGerador);

    manifestos.push({
      numero,
      status,
      certificado,
      cdfNumero,
      clienteNome: gerador.nome || numeroString(obj.clienteNome),
      empreendNome: typeof obj.empreendimento === "string" ? obj.empreendimento : numeroString(obj.empreendNome),
      resumo: typeof obj.resumoResiduos === "string" ? obj.resumoResiduos : numeroString(obj.resumo),
      quantidade: typeof obj.manQuantidade === "number" ? obj.manQuantidade : undefined,
      unidade: numeroString(obj.uniCodigo || obj.unidade),
      dataExpedicao: dataDeMs(obj.dataExpedicao || obj.manDataExpedicao),
      dataRecebimento: dataDeMs(obj.dataRecebimento || obj.manDataRecebimento),
    });
  }

  return manifestos;
}

function fmtDataDm(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

async function gerarManifestosMock(
  conexao: SinirConexaoCompleta,
  dataInicial: Date,
  dataFinal: Date
): Promise<SinirManifestoDados[]> {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { ativo: true },
    select: { id: true, apelido: true, cliente: { select: { apelido: true, cnpj: true } } },
    orderBy: { apelido: "asc" },
  });

  if (empreendimentos.length === 0) {
    throw new SinirError("Nenhum empreendimento ativo cadastrado para simular a verificação", 400);
  }

  const inicio = dataInicial.getTime();
  const fim = dataFinal.getTime();

  return empreendimentos.map((e, i) => {
    const cliente = e.cliente?.apelido || "Cliente";
    const codigo = String(100000 + e.id * 37).padStart(6, "0");
    const numero = `MTR-${dataInicial.getFullYear()}-${codigo}`;
    const quantidade = Math.round((200 + ((e.id * 137) % 1800)) * 100) / 100;
    const unidade = "kg";
    const expedicao = new Date(inicio + ((e.id * 997) % Math.max(1, fim - inicio)));
    const recebimento = new Date(expedicao.getTime() + 86400000 * (1 + ((e.id * 7) % 5)));

    const pendente = (e.id * 31 + i) % 4 === 0;
    const cancelado = (e.id * 53 + i) % 11 === 0;

    if (cancelado) {
      return {
        numero,
        status: SINIR_STATUS.CANCELADO,
        certificado: false,
        clienteNome: cliente,
        empreendNome: e.apelido,
        resumo: "Carga cancelada pelo gerador",
        quantidade,
        unidade,
        dataExpedicao: expedicao,
      };
    }
    if (pendente) {
      return {
        numero,
        status: SINIR_STATUS.RECEBIDO,
        certificado: false,
        clienteNome: cliente,
        empreendNome: e.apelido,
        resumo: `Resíduo classe II — ${quantidade.toLocaleString("pt-BR")} ${unidade} (aguardando certificação)`,
        quantidade,
        unidade,
        dataExpedicao: expedicao,
        dataRecebimento: recebimento,
      };
    }
    return {
      numero,
      status: SINIR_STATUS.CERTIFICADO,
      certificado: true,
      cdfNumero: `CDF-${dataInicial.getFullYear()}-${String(500000 + e.id * 19).padStart(6, "0")}`,
      clienteNome: cliente,
      empreendNome: e.apelido,
      resumo: `Resíduo classe II — ${quantidade.toLocaleString("pt-BR")} ${unidade}`,
      quantidade,
      unidade,
      dataExpedicao: expedicao,
      dataRecebimento: recebimento,
    };
  });
}

export async function verificarManifestos(
  conexao: SinirConexaoCompleta,
  opts: { dataInicial: string; dataFinal: string; tipoParceiro?: number }
): Promise<SinirManifestoDados[]> {
  const tipoParceiro = opts.tipoParceiro ?? 1;
  const [dI, dF] = [new Date(`${opts.dataInicial}T00:00:00`), new Date(`${opts.dataFinal}T23:59:59`)];
  if (isNaN(dI.getTime()) || isNaN(dF.getTime()) || dI > dF) {
    throw new SinirError("Período de verificação inválido", 400);
  }

  if (conexao.modo === "mock") {
    return gerarManifestosMock(conexao, dI, dF);
  }

  return listarManifestosReais(conexao, fmtDataDm(dI), fmtDataDm(dF), tipoParceiro);
}

// ---------- Consulta individual ----------

export async function consultarManifesto(
  conexao: SinirConexaoCompleta,
  numero: string
): Promise<SinirManifestoDados | null> {
  if (!numero) throw new SinirError("Número do manifesto é obrigatório", 400);

  if (conexao.modo === "mock") {
    const existente = await prisma.sinirManifesto.findFirst({
      where: { conexaoId: conexao.id, numero },
    });
    if (!existente) return null;
    return {
      numero: existente.numero,
      status: existente.status,
      certificado: existente.certificado,
      cdfNumero: existente.cdfNumero || undefined,
      clienteNome: existente.clienteNome || undefined,
      empreendNome: existente.empreendNome || undefined,
      resumo: existente.resumo || undefined,
      quantidade: existente.quantidade || undefined,
      unidade: existente.unidade || undefined,
      dataExpedicao: existente.dataExpedicao || undefined,
      dataRecebimento: existente.dataRecebimento || undefined,
    };
  }

  const resultado = await apiFetch(conexao, `/retornaManifesto/${encodeURIComponent(numero)}`);
  const env = (resultado || {}) as { erro?: boolean; mensagem?: string; objeto?: unknown };
  if (env.erro) throw new SinirError(env.mensagem || "Manifesto não encontrado no SINIR", 404);

  const obj = (env.objeto || env) as Record<string, unknown>;
  const { status, certificado, cdfNumero } = statusDeManifestoReal(obj);
  const gerador = extrairParceiro(obj.gerador || obj.dadosGerador);

  return {
    numero: numeroString(obj.manNumero) || numero,
    status,
    certificado,
    cdfNumero,
    clienteNome: gerador.nome || numeroString(obj.clienteNome),
    empreendNome: typeof obj.empreendimento === "string" ? obj.empreendimento : numeroString(obj.empreendNome),
    resumo: typeof obj.resumoResiduos === "string" ? obj.resumoResiduos : numeroString(obj.resumo),
    quantidade: typeof obj.manQuantidade === "number" ? obj.manQuantidade : undefined,
    unidade: numeroString(obj.uniCodigo || obj.unidade),
    dataExpedicao: dataDeMs(obj.dataExpedicao || obj.manDataExpedicao),
    dataRecebimento: dataDeMs(obj.dataRecebimento || obj.manDataRecebimento),
  };
}

// ---------- Emissão ----------

export async function emitirManifesto(
  conexao: SinirConexaoCompleta,
  input: EmitirManifestoInput
): Promise<{ numero: string; simulacao: boolean }> {
  if (!input.resumo || !input.quantidade) {
    throw new SinirError("Resumo do resíduo e quantidade são obrigatórios", 400);
  }
  if (!/^\d{14}$/.test(input.transportadorCnpj || "") || !/^\d{14}$/.test(input.destinadorCnpj || "")) {
    throw new SinirError("CNPJ do transportador e do destinador devem ter 14 dígitos", 400);
  }

  if (conexao.modo === "mock") {
    const numero = `MTR-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 899999))}`;
    await prisma.sinirManifesto.create({
      data: {
        conexaoId: conexao.id,
        numero,
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
    return { numero, simulacao: true };
  }

  const resultado = await apiFetch(conexao, "/salvarManifestoLote", {
    method: "POST",
    body: [
      {
        possuiArmazenamentoTemporario: false,
        nomeResponsavel: "Responsavel Tecnico",
        gerador: { cpfCnpj: conexao.cnpj, unidade: Number(conexao.unidade) || conexao.unidade },
        transportador: { cpfCnpj: input.transportadorCnpj, unidade: Number(input.transportadorCnpj) || input.transportadorCnpj },
        destinador: { cpfCnpj: input.destinadorCnpj, unidade: Number(input.destinadorCnpj) || input.destinadorCnpj },
        nomeMotorista: null,
        placaVeiculo: null,
        dataExpedicao: Date.now(),
        observacoes: input.resumo,
        tipoManifesto: 0,
        listaManifestoResiduos: [
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
        ],
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

  return { numero: resp.manifestoNumeroNacional, simulacao: false };
}

// ---------- Download ----------

export async function baixarManifestoPdf(
  conexao: SinirConexaoCompleta,
  numero: string
): Promise<{ buffer: Uint8Array; filename: string }> {
  if (!numero) throw new SinirError("Número do manifesto é obrigatório", 400);

  const token = tokenReal(conexao);
  const res = await fetch(`${SINIR_API_BASE}/downloadManifesto/${encodeURIComponent(numero)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SinirError(`Erro ao baixar PDF do MTR (HTTP ${res.status})`, res.status);
  }

  const buffer = new Uint8Array(await res.arrayBuffer());
  return { buffer, filename: `MTR-${numero}.pdf` };
}