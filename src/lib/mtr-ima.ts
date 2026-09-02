import { prisma } from "./prisma";
import { criptografar, descriptografar } from "./crypto";

export const MTR_IMA_API_BASE = "https://mtr.ima.sc.gov.br/mtrservice";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class MtrImaError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/* ──────────────── Tipos ──────────────── */

export interface MtrImaConexaoCompleta {
  id: number;
  nome: string;
  cnpj: string;
  cpf: string;
  senha: string;
  unidade: number | null;
  empreendimentoId: number | null;
  ativo: boolean;
  ultimoUsoEm: Date | null;
}

export interface MtrImaManifestoDados {
  numero: string;
  status: string;
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
}

export interface MtrImaCatalogos {
  unidades: { codigo: number; nome: string; sigla: string }[];
  estadosFisicos: { codigo: number; descricao: string }[];
  classes: { codigo: number; descricao: string }[];
  acondicionamentos: { codigo: number; descricao: string }[];
  tratamentos: { codigo: number; descricao: string }[];
}

/* ──────────────── Auth helpers ──────────────── */

function buildAuth(conn: MtrImaConexaoCompleta) {
  return {
    cnp: conn.cnpj.replace(/\D/g, ""),
    login: conn.cpf.replace(/\D/g, ""),
    senha: descriptografar(conn.senha),
    ...(conn.unidade ? { codUnidade: conn.unidade } : {}),
  };
}

async function apiFetch<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${MTR_IMA_API_BASE}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MtrImaError(`MTR-IMA HTTP ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  return res.json() as Promise<T>;
}

/* ──────────────── Conexao helpers ──────────────── */

async function carregarConexao(conexaoId: number): Promise<MtrImaConexaoCompleta> {
  const conn = await prisma.mtrImaConexao.findUnique({ where: { id: conexaoId } });
  if (!conn) throw new MtrImaError("Conexão MTR-IMA não encontrada", 404);
  return conn as MtrImaConexaoCompleta;
}

async function atualizarUso(conexaoId: number) {
  await prisma.mtrImaConexao.update({ where: { id: conexaoId }, data: { ultimoUsoEm: new Date() } }).catch(() => {});
}

/* ──────────────── Conexao CRUD ──────────────── */

export async function listarConexoes() {
  const conexoes = await prisma.mtrImaConexao.findMany({
    where: { ativo: true },
    include: {
      _count: { select: { manifestos: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { nome: "asc" },
  });
  return conexoes.map(({ senha, ...c }) => ({ ...c, temSenha: Boolean(senha) }));
}

export async function criarConexao(data: {
  nome: string;
  cnpj: string;
  cpf: string;
  senha: string;
  unidade?: number | null;
  empreendimentoId?: number | null;
}) {
  return prisma.mtrImaConexao.create({
    data: {
      nome: data.nome,
      cnpj: data.cnpj.replace(/\D/g, ""),
      cpf: data.cpf.replace(/\D/g, ""),
      senha: criptografar(data.senha),
      unidade: data.unidade ?? null,
      empreendimentoId: data.empreendimentoId ?? null,
    },
  });
}

export async function atualizarConexao(id: number, data: { nome?: string; cnpj?: string; cpf?: string; senha?: string; unidade?: number | null; empreendimentoId?: number | null; ativo?: boolean }) {
  const update: Record<string, unknown> = { ...data };
  if (data.senha) update.senha = criptografar(data.senha);
  if (data.cnpj) update.cnpj = data.cnpj.replace(/\D/g, "");
  if (data.cpf) update.cpf = data.cpf.replace(/\D/g, "");
  return prisma.mtrImaConexao.update({ where: { id }, data: update });
}

export async function excluirConexao(id: number) {
  return prisma.mtrImaConexao.update({ where: { id }, data: { ativo: false } });
}

export async function excluirManifestosConexao(conexaoId: number) {
  return prisma.mtrImaManifesto.deleteMany({ where: { conexaoId } });
}

/* ──────────────── Catálogos (tabelas de referência) ──────────────── */

export function catalogos(): MtrImaCatalogos {
  return {
    unidades: [
      { codigo: 1, nome: "Quilograma", sigla: "kg" },
      { codigo: 2, nome: "Tonelada", sigla: "t" },
      { codigo: 3, nome: "Litro", sigla: "L" },
      { codigo: 4, nome: "Metro cúbico", sigla: "m³" },
      { codigo: 5, nome: "Unidade", sigla: "un" },
      { codigo: 6, nome: "Pacote", sigla: "p" },
    ],
    estadosFisicos: [
      { codigo: 1, descricao: "Sólido" },
      { codigo: 2, descricao: "Líquido" },
      { codigo: 3, descricao: "Gasoso" },
      { codigo: 4, descricao: "Pastoso" },
      { codigo: 5, descricao: "Semissólido" },
    ],
    classes: [
      { codigo: 1, descricao: "Classe I — Perigoso" },
      { codigo: 2, descricao: "Classe II — Não-perigoso" },
      { codigo: 3, descricao: "Classe II — Inerte" },
      { codigo: 4, descricao: "Classe A (RCC)" },
      { codigo: 5, descricao: "Classe B (RCC)" },
      { codigo: 6, descricao: "Classe C (RCC)" },
      { codigo: 7, descricao: "Classe D (RCC)" },
    ],
    acondicionamentos: [
      { codigo: 1, descricao: "Saco plástico" },
      { codigo: 2, descricao: "Caixa papelão" },
      { codigo: 3, descricao: "Caixa plástica" },
      { codigo: 4, descricao: "Tambor metálico" },
      { codigo: 5, descricao: "Tambor plástico" },
      { codigo: 6, descricao: "Bidão" },
      { codigo: 7, descricao: "Fardo / Envelopado" },
      { codigo: 8, descricao: "Granel" },
      { codigo: 9, descricao: "Caçamba aberta" },
      { codigo: 10, descricao: "Caçamba fechada" },
      { codigo: 11, descricao: "Container" },
      { codigo: 12, descricao: "Caixa" },
      { codigo: 13, descricao: "Tonel" },
    ],
    tratamentos: [
      { codigo: 1, descricao: "Recuperação / Reciclagem" },
      { codigo: 2, descricao: "Tratamento químico" },
      { codigo: 3, descricao: "Tratamento biológico" },
      { codigo: 4, descricao: "Tratamento térmico" },
      { codigo: 5, descricao: "Tratamento físico-químico" },
      { codigo: 6, descricao: "Disposição final em aterro industrial" },
      { codigo: 7, descricao: "Aterro industrial" },
      { codigo: 8, descricao: "Disposição em aterro de resíduos perigosos" },
      { codigo: 9, descricao: "Coprocessamento" },
      { codigo: 10, descricao: "Solidificação / Estabilização" },
      { codigo: 11, descricao: "Tratamento de efluentes líquidos" },
      { codigo: 12, descricao: "Tratamento biológico anaeróbio" },
      { codigo: 13, descricao: "Tratamento biológico aeróbio" },
    ],
  };
}

/* ──────────────── Consulta de MTRs ──────────────── */

export async function consultarManifesto(conexaoId: number, numero: string): Promise<MtrImaManifestoDados> {
  const conn = await carregarConexao(conexaoId);
  const auth = buildAuth(conn);
  const body = { ...auth, manifestoJSON: { manifestoCodigo: numero } };

  const result = await apiFetch<{
    retornoCodigo: number;
    retorno: string;
    manifestoJSON?: Record<string, unknown>;
    manifestoItensJSON?: Array<Record<string, unknown>>;
  }>("retornaManifestoPdf", body);

  if (result.retornoCodigo !== 0) {
    throw new MtrImaError(`Consulta MTR falhou: ${result.retorno}`, 400);
  }

  await atualizarUso(conexaoId);

  const m = result.manifestoJSON || {};
  const itens = result.manifestoItensJSON || [];
  const quantidade = itens.reduce((sum: number, i: Record<string, unknown>) => sum + Number(i.quantidade || 0), 0);

  return {
    numero: String(m.manifestoCodigo || numero),
    status: String(m.situacao || "EMITIDO"),
    clienteNome: String(m.geradorRazaoSocial || m.cnpGerador || "") || undefined,
    transportadorNome: String(m.transportadorRazaoSocial || m.cnpTransportador || "") || undefined,
    destinadorNome: String(m.destinadorRazaoSocial || m.cnpDestinador || "") || undefined,
    resumo: (m.manifObservacao as string) || undefined,
    quantidade,
    unidade: itens.length > 0 ? String(itens[0].descricaoUnidade || "") || undefined : undefined,
    dataExpedicao: m.manifTransportadorDataExpedicao ? new Date(String(m.manifTransportadorDataExpedicao)) : undefined,
    dataRecebimento: m.dataRecebimento ? new Date(String(m.dataRecebimento)) : undefined,
    classeRisco: undefined,
    classeNome: undefined,
  };
}

/* ──────────────── Emissão de MTR ──────────────── */

export interface MtrImaResiduoInput {
  codigoSequencial: number;
  residuo: string;
  quantidade: number;
  codigoUnidade: number;
  codigoTipoEstado: number;
  codigoClasse: number;
  codigoAcondicionamento: number;
  codigoTecnologia: number;
  tipoDensidadeValor?: string;
  tipoDensidadeUnidade?: string;
  manifestoItemObservacao?: string;
  numeroONU?: string;
  classeDeRisco?: string;
  nomeEmbarque?: string;
  grupoEmbalagem?: string;
}

export interface MtrImaManifestoInput {
  conexaoId: number;
  clienteNome?: string;
  empreendNome?: string;
  cnpGerador: string;
  codUnidadeGerador?: number;
  cnpTransportador: string;
  codUnidadeTransportador?: number;
  cnpDestinador: string;
  codUnidadeDestinador?: number;
  cnpArmazenador?: string;
  codUnidadeArmazenador?: number;
  manifObservacao?: string;
  manifGeradorNomeResponsavel: string;
  manifGeradorCargoResponsavel: string;
  manifTransportadorNomeMotorista?: string;
  manifTransportadorPlacaVeiculo?: string;
  manifTransportadorDataExpedicao?: string;
  seuCodigoReferencia?: string;
  resumo?: string;
  quantidade?: number;
  unidade?: string;
  transportadorNome?: string;
  destinadorNome?: string;
  itens: MtrImaResiduoInput[];
}

export async function emitirManifesto(input: MtrImaManifestoInput): Promise<{ numero: string; codigoBarra?: string }> {
  const conn = await carregarConexao(input.conexaoId);
  const auth = buildAuth(conn);
  const { itens, conexaoId, clienteNome, empreendNome, resumo, quantidade, unidade, transportadorNome, destinadorNome, ...manifData } = input;

  const body = {
    ...auth,
    manifestoJSONDtos: [
      {
        ...manifData,
        cnpGerador: manifData.cnpGerador.replace(/\D/g, ""),
        cnpTransportador: manifData.cnpTransportador.replace(/\D/g, ""),
        cnpDestinador: manifData.cnpDestinador.replace(/\D/g, ""),
        ...(manifData.cnpArmazenador ? { cnpArmazenador: manifData.cnpArmazenador.replace(/\D/g, "") } : {}),
      },
    ],
    itemManifestoJSONs: itens.map((item) => ({
      ...item,
      residuo: item.residuo.replace(/\D/g, ""),
    })),
  };

  const result = await apiFetch<{
    retornoCodigo: number;
    retorno: string;
    manifestoCodigo?: string;
    codigoBarra?: string;
  }>("salvarManifestoLote", body);

  if (result.retornoCodigo !== 0) {
    throw new MtrImaError(`Emissão MTR falhou: ${result.retorno}`, 400);
  }

  const numero = result.manifestoCodigo || "";

  await prisma.mtrImaManifesto.create({
    data: {
      conexaoId,
      numero,
      status: "EMITIDO",
      clienteNome: clienteNome || null,
      empreendNome: empreendNome || null,
      transportadorNome: transportadorNome || null,
      destinadorNome: destinadorNome || null,
      resumo: resumo || manifData.manifObservacao || null,
      quantidade: quantidade ?? null,
      unidade: unidade ?? null,
      dataExpedicao: manifData.manifTransportadorDataExpedicao ? new Date(manifData.manifTransportadorDataExpedicao) : null,
    },
  }).catch(() => {});

  await atualizarUso(conexaoId);

  return { numero, codigoBarra: result.codigoBarra };
}

/* ──────────────── Download PDF ──────────────── */

export async function baixarManifestoPdf(conexaoId: number, numero: string): Promise<{ buffer: Buffer; filename: string }> {
  const conn = await carregarConexao(conexaoId);
  const auth = buildAuth(conn);
  const body = { ...auth, manifestoJSON: { manifestoCodigo: numero } };

  const res = await fetch(`${MTR_IMA_API_BASE}/retornaManifestoPdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new MtrImaError(`Download PDF falhou: HTTP ${res.status}`, res.status);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await res.json()) as { retornoCodigo?: number; retorno?: string };
    if (json.retornoCodigo !== 0) {
      throw new MtrImaError(`PDF não disponível: ${json.retorno || "desconhecido"}`, 404);
    }
    throw new MtrImaError("Resposta inesperada ao baixar PDF", 502);
  }

  const arrayBuf = await res.arrayBuffer();
  await atualizarUso(conexaoId);

  return { buffer: Buffer.from(arrayBuf), filename: `MTR-IMA-${numero}.pdf` };
}

/* ──────────────── Cancelamento ──────────────── */

export async function cancelarManifesto(conexaoId: number, numero: string, justificativa: string): Promise<{ ok: boolean; mensagem: string }> {
  const conn = await carregarConexao(conexaoId);
  const auth = buildAuth(conn);
  const body = { ...auth, manifestoJSON: { manifestoCodigo: numero, justificativa } };

  const result = await apiFetch<{ retornoCodigo: number; retorno: string }>("cancelaManifesto", body);

  if (result.retornoCodigo === 0) {
    await prisma.mtrImaManifesto.updateMany({ where: { conexaoId, numero }, data: { status: "CANCELADO" } }).catch(() => {});
  }

  await atualizarUso(conexaoId);
  return { ok: result.retornoCodigo === 0, mensagem: result.retorno };
}

/* ──────────────── Recebimento ──────────────── */

export async function receberManifesto(conexaoId: number, numero: string): Promise<{ ok: boolean; mensagem: string }> {
  const conn = await carregarConexao(conexaoId);
  const auth = buildAuth(conn);
  const body = { ...auth, manifestoJSON: { manifestoCodigo: numero } };

  const result = await apiFetch<{ retornoCodigo: number; retorno: string }>("recebimentoManifesto", body);

  if (result.retornoCodigo === 0) {
    await prisma.mtrImaManifesto.updateMany({ where: { conexaoId, numero }, data: { status: "RECEBIDO", dataRecebimento: new Date() } }).catch(() => {});
  }

  await atualizarUso(conexaoId);
  return { ok: result.retornoCodigo === 0, mensagem: result.retorno };
}
