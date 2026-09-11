import { prisma } from "./prisma";
import { descriptografar } from "./crypto";
import { MtrImaError } from "./mtr-ima";
import type { MtrImaManifestoDados } from "./mtr-ima";

export const MTR_IMA_PORTAL = "https://mtr.ima.sc.gov.br";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const PERFIS: { perfil: string; origem: string; colunas: string[] }[] = [
  { perfil: "1", origem: "gerador", colunas: ["manifCodigo", "manifDataExpedicao", "manifTransportadorCnpj", "manifDestinadorCnpj", "situacaoManifestoDescricao", "acoes"] },
  { perfil: "4", origem: "destinador", colunas: ["manifCodigo", "manifDataExpedicao", "manifGeradorCnpj", "manifTransportadorCnpj", "situacaoManifestoDescricao", "acoes"] },
  { perfil: "2", origem: "transportador", colunas: ["manifCodigo", "manifDataExpedicao", "manifGeradorCnpj", "manifDestinadorCnpj", "situacaoManifestoDescricao", "acoes"] },
  { perfil: "0", origem: "armazenador", colunas: ["manifCodigo", "manifDataExpedicao", "manifGeradorCnpj", "manifTransportadorCnpj", "manifDestinadorCnpj", "situacaoManifestoDescricao", "acoes"] },
];

const LOTE = 200;
const ANOS_PADRAO = 10;

interface SessaoPortal {
  cookies: Map<string, string>;
}

interface LinhaPortal {
  numero: string;
  dataExpedicao: Date | null;
  transportadorNome?: string;
  destinadorNome?: string;
  geradorNome?: string;
  situacao: string;
  origem: string;
}

function setarCookie(jar: Map<string, string>, setCookie: string[] | null) {
  if (!setCookie) return;
  for (const c of setCookie) {
    const par = c.split(";")[0];
    const idx = par.indexOf("=");
    if (idx < 0) continue;
    jar.set(par.slice(0, idx).trim(), par.slice(idx + 1).trim());
  }
}

function cookiesHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchPortal(sessao: SessaoPortal, path: string, opts: { method?: string; body?: string; ctype?: string } = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const headers: Record<string, string> = {
      "User-Agent": UA,
      Cookie: cookiesHeader(sessao.cookies),
      Referer: `${MTR_IMA_PORTAL}/ControllerServlet?acao=acompanhamentoManifesto`,
    };
    if (opts.ctype) headers["Content-Type"] = `${opts.ctype}; charset=UTF-8`;
    if (opts.body) headers["X-Requested-With"] = "XMLHttpRequest";
    const res = await fetch(`${MTR_IMA_PORTAL}${path}`, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      redirect: "manual",
      headers,
      ...(opts.body ? { body: opts.body } : {}),
      signal: ctrl.signal,
    });
    let sc: string[] | null = res.headers.getSetCookie ? res.headers.getSetCookie() : null;
    if (!sc || sc.length === 0) {
      const bruto = res.headers.get("set-cookie");
      if (bruto) sc = [bruto];
    }
    setarCookie(sessao.cookies, sc);
    return res;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new MtrImaError("Tempo esgotado ao acessar o portal MTR-IMA", 504);
    throw new MtrImaError("Falha de conexão com o portal MTR-IMA", 502);
  } finally {
    clearTimeout(timer);
  }
}

function formatarDataBr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function parsearDataBr(v: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || "").trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function isoParaBr(v: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || "").trim());
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function normalizarStatus(situacao: string): string {
  const s = (situacao || "").toLowerCase();
  if (s.includes("cancelado")) return "CANCELADO";
  if (s.includes("recebido")) return "RECEBIDO";
  if (s.includes("pendente")) return "PENDENTE";
  return "EMITIDO";
}

async function resolverUnidade(sessao: SessaoPortal, cnpj: string): Promise<number> {
  const res = await fetchPortal(
    sessao,
    "/ControllerServlet",
    { method: "POST", ctype: "application/x-www-form-urlencoded", body: `acao=pesquisaUsuarioUnidades&txtCnpj=${encodeURIComponent(cnpj)}` },
  );
  if (!res.ok) {
    throw new MtrImaError("Não foi possível consultar as unidades do portal MTR-IMA", 502);
  }
  const html = await res.text();
  const m = /unidadeSelecionada\(\s*'?(\d+)'?\s*,\s*/.exec(html);
  if (!m) {
    throw new MtrImaError("CNPJ não possui unidade cadastrada no portal MTR-IMA", 404);
  }
  return Number(m[1]);
}

export async function loginPortal(conexaoId: number): Promise<SessaoPortal> {
  const conn = await prisma.mtrImaConexao.findUnique({ where: { id: conexaoId } });
  if (!conn) throw new MtrImaError("Conexão MTR-IMA não encontrada", 404);
  if (!conn.ativo) throw new MtrImaError("Conexão MTR-IMA está inativa", 400);

  const senha = descriptografar(conn.senha);
  if (!senha) throw new MtrImaError("Senha da conexão não pôde ser descriptografada", 400);

  const sessao: SessaoPortal = { cookies: new Map() };
  const inicial = await fetchPortal(sessao, "/");
  if (!inicial.ok) throw new MtrImaError("Falha ao abrir sessão no portal MTR-IMA", 502);

  let unidade = conn.unidade;
  if (!unidade) {
    unidade = await resolverUnidade(sessao, conn.cnpj);
    await prisma.mtrImaConexao.update({ where: { id: conexaoId }, data: { unidade } }).catch(() => {});
  }

  const cpf = conn.cpf.replace(/\D/g, "");
  const cnpj = conn.cnpj.replace(/\D/g, "");
  const body =
    `acao=autenticaUsuario&estado=SC&txtCnpj=${encodeURIComponent(cnpj)}` +
    `&txtSenha=${encodeURIComponent(senha)}` +
    `&txtUnidadeCodigo=${unidade}` +
    `&txtCpfUsuario=${cpf}&tipoPessoaSociedade=${conn.cnpj.replace(/\D/g, "").length === 14 ? "J" : "F"}`;

  const login = await fetchPortal(sessao, "/ControllerServlet", { method: "POST", ctype: "application/x-www-form-urlencoded", body });
  const texto = await login.text().catch(() => "");
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new MtrImaError("Resposta inesperada no login do portal MTR-IMA", 502);
  }
  if (json.sucesso !== "s") {
    throw new MtrImaError(`Falha no login do portal MTR-IMA: ${String(json.msg || "usuário ou senha inválidos")}`, 401);
  }

  await prisma.mtrImaConexao.update({ where: { id: conexaoId }, data: { ultimoUsoEm: new Date() } }).catch(() => {});
  return sessao;
}

async function listarPerfil(sessao: SessaoPortal, def: (typeof PERFIS)[number], di: string, df: string, numMtr = ""): Promise<LinhaPortal[]> {
  const coletados: LinhaPortal[] = [];
  for (let inicio = 0; ; inicio += LOTE) {
    const q = new URLSearchParams({
      tabela: "MTR",
      perfil: def.perfil,
      MTRsAbertos: "",
      MTRsComCdf: "",
      dataInicial: di,
      dataFinal: df,
      numMtr,
      sEcho: "1",
      iColumns: String(def.colunas.length),
      iDisplayStart: String(inicio),
      iDisplayLength: String(LOTE),
      sColumns: def.colunas.join(","),
      sSearch: "",
      iSortCol_0: "0",
      sSortDir_0: "asc",
    });
    const res = await fetchPortal(
      sessao,
      `/br/com/brdti/mtr/controller/JqueryDatatablePluginDemo.java?${q.toString()}`,
    );
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) {
      throw new MtrImaError("Falha ao listar MTRs no portal MTR-IMA", 502);
    }
    const j = (await res.json()) as { iTotalRecords?: number; iTotalDisplayRecords?: number; aaData?: Array<Array<string>> };
    const total = Number(j.iTotalRecords || 0);
    const linhas = (j.aaData || []).map((r) => {
      const obj: Record<string, string> = {};
      def.colunas.forEach((c, i) => {
        obj[c] = r[i] ?? "";
      });
      return obj;
    });
    for (const o of linhas) {
      coletados.push({
        numero: String(o.manifCodigo).trim(),
        dataExpedicao: parsearDataBr(o.manifDataExpedicao),
        transportadorNome: o.manifTransportadorCnpj ? o.manifTransportadorCnpj.trim() : undefined,
        destinadorNome: o.manifDestinadorCnpj ? o.manifDestinadorCnpj.trim() : undefined,
        geradorNome: o.manifGeradorCnpj ? o.manifGeradorCnpj.trim() : undefined,
        situacao: (o.situacaoManifestoDescricao || "").trim(),
        origem: def.origem,
      });
    }
    if (coletados.length >= total || linhas.length === 0) break;
  }
  return coletados;
}

export async function sincronizarManifestosConexao(
  conexaoId: number,
  anos = ANOS_PADRAO,
  periodo?: { dataInicial?: string; dataFinal?: string },
) {
  const sessao = await loginPortal(conexaoId);

  const fim = (periodo?.dataFinal && isoParaBr(periodo.dataFinal)) || formatarDataBr(new Date());
  let inicio: string | null = periodo?.dataInicial ? isoParaBr(periodo.dataInicial) : null;
  if (!inicio) {
    const inicioDerivado = new Date();
    inicioDerivado.setFullYear(inicioDerivado.getFullYear() - anos);
    inicio = formatarDataBr(inicioDerivado);
  }

  const mapa = new Map<string, LinhaPortal>();
  for (const def of PERFIS) {
    const linhas = await listarPerfil(sessao, def, inicio, fim);
    for (const l of linhas) {
      if (l.numero && !mapa.has(l.numero)) mapa.set(l.numero, l);
    }
  }

  let importados = 0;
  let atualizados = 0;
  for (const linha of mapa.values()) {
    const existente = await prisma.mtrImaManifesto.findFirst({ where: { conexaoId, numero: linha.numero } });
    const dados = {
      status: normalizarStatus(linha.situacao),
      transportadorNome: linha.transportadorNome || null,
      destinadorNome: linha.destinadorNome || null,
      dataExpedicao: linha.dataExpedicao,
    };
    if (existente) {
      const precisaAtualizar =
        existente.status !== dados.status ||
        (existente.transportadorNome ?? "") !== (dados.transportadorNome ?? "") ||
        (existente.destinadorNome ?? "") !== (dados.destinadorNome ?? "") ||
        existente.dataExpedicao?.getTime() !== dados.dataExpedicao?.getTime();
      if (precisaAtualizar) {
        await prisma.mtrImaManifesto.update({ where: { id: existente.id }, data: dados });
        atualizados++;
      }
    } else {
      await prisma.mtrImaManifesto.create({ data: { conexaoId, numero: linha.numero, ...dados } });
      importados++;
    }
  }

  const conn = await prisma.mtrImaConexao.findUnique({ where: { id: conexaoId } });
  return {
    conexaoId,
    nome: conn?.nome || "",
    total: mapa.size,
    importados,
    atualizados,
    unidade: conn?.unidade ?? null,
  };
}

/* ──────────────── Consulta individual por número ──────────────── */

function janelaConsulta(): { di: string; df: string } {
  const fim = formatarDataBr(new Date());
  const inicio = new Date();
  inicio.setFullYear(inicio.getFullYear() - 15);
  return { di: formatarDataBr(inicio), df: fim };
}

async function consultarPorNumero(sessao: SessaoPortal, numero: string): Promise<LinhaPortal | null> {
  const num = String(numero || "").trim();
  if (!num) return null;
  const { di, df } = janelaConsulta();
  for (const def of PERFIS) {
    const linhas = await listarPerfil(sessao, def, di, df, num);
    const achada = linhas.find((l) => l.numero === num);
    if (achada) return achada;
  }
  return null;
}

export async function consultarManifestoPortal(conexaoId: number, numero: string): Promise<MtrImaManifestoDados> {
  const num = String(numero || "").trim();
  if (!num) throw new MtrImaError("Número do MTR é obrigatório", 400);
  const sessao = await loginPortal(conexaoId);
  const linha = await consultarPorNumero(sessao, num);
  if (!linha) throw new MtrImaError(`MTR ${num} não encontrado no portal IMA`, 404);
  const conn = await prisma.mtrImaConexao.findUnique({ where: { id: conexaoId } });
  return {
    numero: linha.numero,
    status: normalizarStatus(linha.situacao),
    clienteNome: linha.geradorNome || conn?.nome || undefined,
    transportadorNome: linha.transportadorNome,
    destinadorNome: linha.destinadorNome,
    resumo: linha.situacao || undefined,
    dataExpedicao: linha.dataExpedicao || undefined,
  };
}

/* ──────────────── Download do PDF ──────────────── */

export async function baixarManifestoPdfPortal(conexaoId: number, numero: string): Promise<{ buffer: Buffer; filename: string }> {
  const num = String(numero || "").trim();
  if (!num) throw new MtrImaError("Número do MTR é obrigatório", 400);
  const sessao = await loginPortal(conexaoId);
  const res = await fetchPortal(
    sessao,
    `/ControllerServlet?acao=relatorio&nomeRelatorio=manifesto&manifesto=${encodeURIComponent(num)}&condicao=N`,
  );
  const tipo = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !tipo.includes("pdf") || buf.subarray(0, 5).toString() !== "%PDF-") {
    throw new MtrImaError(`PDF do MTR ${num} não disponível no portal IMA`, 404);
  }
  await prisma.mtrImaConexao.update({ where: { id: conexaoId }, data: { ultimoUsoEm: new Date() } }).catch(() => {});
  return { buffer: buf, filename: `MTR-IMA-${num}.pdf` };
}

/* ──────────────── Cancelamento / Recebimento ──────────────── */

async function refletirLocal(conexaoId: number, numero: string, linha: LinhaPortal) {
  const atual = await prisma.mtrImaManifesto.findFirst({ where: { conexaoId, numero } }).catch(() => null);
  if (!atual) return;
  const status = normalizarStatus(linha.situacao);
  await prisma.mtrImaManifesto
    .update({
      where: { id: atual.id },
      data: {
        status,
        transportadorNome: linha.transportadorNome || null,
        destinadorNome: linha.destinadorNome || null,
        dataExpedicao: linha.dataExpedicao,
        ...(status === "RECEBIDO" && !atual.dataRecebimento ? { dataRecebimento: new Date() } : {}),
      },
    })
    .catch(() => {});
}

function mensagemPortal(texto: string): string {
  try {
    const j = JSON.parse(texto) as Record<string, unknown>;
    return String(j.msgOk || j.msg || j.retorno || "");
  } catch {
    return "";
  }
}

export async function cancelarManifestoPortal(
  conexaoId: number,
  numero: string,
  justificativa: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const num = String(numero || "").trim();
  const just = String(justificativa || "").trim();
  if (!num) throw new MtrImaError("Número do MTR é obrigatório", 400);
  if (!just) throw new MtrImaError("Justificativa do cancelamento é obrigatória", 400);
  const sessao = await loginPortal(conexaoId);
  const res = await fetchPortal(sessao, "/ControllerServlet?acao=cancelaManifesto", {
    method: "POST",
    ctype: "application/x-www-form-urlencoded",
    body: `codManifesto=${encodeURIComponent(num)}&justificativa=${encodeURIComponent(just)}`,
  });
  const msgPortal = mensagemPortal(await res.text().catch(() => ""));
  const linha = await consultarPorNumero(sessao, num);
  if (linha && normalizarStatus(linha.situacao) === "CANCELADO") {
    await refletirLocal(conexaoId, num, linha);
    return { ok: true, mensagem: msgPortal || `MTR ${num} cancelado no portal IMA` };
  }
  throw new MtrImaError(msgPortal || `O portal IMA não confirmou o cancelamento do MTR ${num}`, 400);
}

export async function receberManifestoPortal(
  conexaoId: number,
  numero: string,
  responsavel: string,
  cargo: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const num = String(numero || "").trim();
  const resp = String(responsavel || "").trim();
  const cg = String(cargo || "").trim();
  if (!num) throw new MtrImaError("Número do MTR é obrigatório", 400);
  if (!resp || !cg) throw new MtrImaError("Responsável e cargo do recebimento são obrigatórios", 400);
  const sessao = await loginPortal(conexaoId);
  const res = await fetchPortal(sessao, "/ControllerServlet", {
    method: "POST",
    ctype: "application/x-www-form-urlencoded",
    body: `acao=recebeManifesto&respRecebimento=${encodeURIComponent(resp)}&codManifesto=${encodeURIComponent(num)}&respCargo=${encodeURIComponent(cg)}`,
  });
  const msgPortal = mensagemPortal(await res.text().catch(() => ""));
  const linha = await consultarPorNumero(sessao, num);
  if (linha && normalizarStatus(linha.situacao) === "RECEBIDO") {
    await refletirLocal(conexaoId, num, linha);
    return { ok: true, mensagem: msgPortal || `MTR ${num} recebido no portal IMA` };
  }
  throw new MtrImaError(msgPortal || `O portal IMA não confirmou o recebimento do MTR ${num}`, 400);
}

/* ──────────────── Modelos do portal ──────────────── */

export interface ModeloPortalResumo {
  codigo: string;
  nome: string;
  transportador: string;
  destinador: string;
}

export interface ModeloPortalResiduo {
  residuo: string;
  quantidade: string;
  codigoUnidade: string;
  codigoTipoEstado: string;
  codigoClasse: string;
  codigoAcondicionamento: string;
  codigoTecnologia: string;
  numeroONU: string;
  classeDeRisco: string;
  nomeEmbarque: string;
  grupoEmbalagem: string;
}

export interface ModeloPortalDetalhe {
  codigo: string;
  nome: string;
  transportadorCnpj: string;
  transportadorNome: string;
  transportadorUnidade: number | null;
  destinadorCnpj: string;
  destinadorNome: string;
  destinadorUnidade: number | null;
  armazenadorCnpj: string | null;
  armazenadorNome: string | null;
  residuos: ModeloPortalResiduo[];
}

function textoCelula(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listarModelosPortal(conexaoId: number): Promise<ModeloPortalResumo[]> {
  const sessao = await loginPortal(conexaoId);
  const res = await fetchPortal(sessao, "/ControllerServlet", {
    method: "POST",
    ctype: "application/x-www-form-urlencoded",
    body: "acao=pesquisaTemplate&tela=cadastroModeloMtr",
  });
  const html = await res.text();
  const modelos = new Map<string, ModeloPortalResumo>();
  for (const m of html.matchAll(/<tr>([\s\S]{0,2000}?)<\/tr>/g)) {
    const linha = m[1];
    const sel = /templateSelecionado\('(\d+)','([^']+)'/.exec(linha);
    if (!sel) continue;
    const celulas = [...linha.matchAll(/<td[^>]*>([\s\S]{0,300}?)<\/td>/g)].map((c) => textoCelula(c[1]));
    modelos.set(sel[1], {
      codigo: sel[1],
      nome: sel[2].trim(),
      transportador: (celulas[2] || "").trim(),
      destinador: (celulas[3] || "").trim(),
    });
  }
  return [...modelos.values()];
}

export async function detalharModeloPortal(conexaoId: number, codigo: string): Promise<ModeloPortalDetalhe> {
  const cod = String(codigo || "").trim();
  if (!cod) throw new MtrImaError("Código do modelo é obrigatório", 400);
  const sessao = await loginPortal(conexaoId);
  const res = await fetchPortal(sessao, "/ControllerServlet?acao=buscaTemplate", {
    method: "POST",
    ctype: "application/x-www-form-urlencoded",
    body: `&codTemplate=${encodeURIComponent(cod)}`,
  });
  const texto = await res.text();
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(texto);
  } catch {
    throw new MtrImaError(`Modelo ${cod} não encontrado no portal IMA`, 404);
  }
  if (!j || j.templateCodigo == null) {
    throw new MtrImaError(`Modelo ${cod} não encontrado no portal IMA`, 404);
  }
  let itens: Array<Record<string, unknown>> = [];
  try {
    const bruto = String(j.listaItem || "[]");
    const parsed: unknown = JSON.parse(bruto);
    if (Array.isArray(parsed)) itens = parsed as Array<Record<string, unknown>>;
  } catch {
    itens = [];
  }
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const str = (v: unknown) => String(v ?? "").trim();
  return {
    codigo: String(j.templateCodigo),
    nome: str(j.nome),
    transportadorCnpj: str(j.transportadorCNPJ).replace(/\D/g, ""),
    transportadorNome: str(j.transportadorNome),
    transportadorUnidade: num(j.transportador),
    destinadorCnpj: str(j.destinadorCNPJ).replace(/\D/g, ""),
    destinadorNome: str(j.destinadorNome),
    destinadorUnidade: num(j.destinador),
    armazenadorCnpj: str(j.armazenadorCNPJ).replace(/\D/g, "") || null,
    armazenadorNome: str(j.armazenadorNome) || null,
    residuos: itens.map((it) => ({
      residuo: str(it.tipoResiduo3Numero),
      quantidade: "",
      codigoUnidade: str(it.tipoUnidadeCodigo),
      codigoTipoEstado: str(it.tipoEstadoFisicoCodigo),
      codigoClasse: str(it.tipoClasseCodigo),
      codigoAcondicionamento: str(it.tipoAcondicionamentoCodigo),
      codigoTecnologia: str(it.tipoTecnologiaCodigo),
      tipoDensidadeValor: "",
      tipoDensidadeUnidade: str(it.tipoUnidadeCodigo) === "2" ? "2" : "1",
      numeroONU: str(it.numeroONU),
      classeDeRisco: str(it.classeDeRisco),
      nomeEmbarque: str(it.nomeEmbarque),
      grupoEmbalagem: str(it.grupoEmbalagem),
    })),
  };
}

export async function importarModelosPortal(conexaoId: number) {
  const conn = await prisma.mtrImaConexao.findUnique({ where: { id: conexaoId } });
  if (!conn) throw new MtrImaError("Conexão MTR-IMA não encontrada", 404);
  const resumos = await listarModelosPortal(conexaoId);
  let importados = 0;
  let atualizados = 0;
  for (const r of resumos) {
    const d = await detalharModeloPortal(conexaoId, r.codigo);
    const dados = {
      nome: d.nome || r.nome,
      transportadorCnpj: d.transportadorCnpj || null,
      transportadorNome: d.transportadorNome || null,
      transportadorUnidade: d.transportadorUnidade,
      destinadorCnpj: d.destinadorCnpj || null,
      destinadorNome: d.destinadorNome || null,
      destinadorUnidade: d.destinadorUnidade,
      armazenadorCnpj: d.armazenadorCnpj,
      armazenadorNome: d.armazenadorNome,
      residuos: JSON.parse(JSON.stringify(d.residuos)),
    };
    const existente = await prisma.mtrImaModelo.findFirst({
      where: { conexaoId, codigoPortal: Number(d.codigo) },
    });
    if (existente) {
      await prisma.mtrImaModelo.update({ where: { id: existente.id }, data: dados });
      atualizados++;
    } else {
      await prisma.mtrImaModelo.create({
        data: { conexaoId, codigoPortal: Number(d.codigo), ...dados },
      });
      importados++;
    }
  }
  return { conexaoId, nome: conn.nome, total: resumos.length, importados, atualizados };
}