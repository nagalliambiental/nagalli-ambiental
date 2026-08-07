import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const INTERVALO_BACKUP_DIAS = 15;
export const MAX_BACKUPS = 30;

function fmtData(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtDataHora(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtSimNao(v: boolean | null | undefined): string {
  return v ? "Sim" : "Não";
}

function fmtJson(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function diasAte(v: Date | null | undefined): number | string {
  if (!v) return "";
  const diff = Math.ceil((v.getTime() - Date.now()) / 86400000);
  return diff;
}

function addSheet(wb: XLSX.WorkBook, nome: string, linhas: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(linhas);
  ws["!cols"] = [];
  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
}

export async function registrarBackup(buf: Buffer, origem: string, usuarioId?: number) {
  const agora = new Date();
  const stamp = agora.toISOString().replace(/[:.]/g, "-");
  const nomeArquivo = `backup-nagalli-${stamp}.xlsx`;
  const caminho = `/uploads/backups/${nomeArquivo}`;

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "backups");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, nomeArquivo), buf);
  } catch {
    // ambiente sem escrita em disco (ex.: Vercel) - o conteúdo fica no banco
  }

  await prisma.backup.create({
    data: { arquivo: caminho, tamanho: buf.length, origem, usuarioId: usuarioId ?? null, conteudo: new Uint8Array(buf) },
  });

  // Retenção: mantém apenas os MAX_BACKUPS mais recentes
  const antigos = await prisma.backup.findMany({
    where: { conteudo: { not: null } },
    orderBy: { criadoEm: "desc" },
    select: { id: true, criadoEm: true },
    skip: MAX_BACKUPS,
  });
  if (antigos.length > 0) {
    const idsAntigos = antigos.map((b) => b.id);
    await prisma.backup.deleteMany({ where: { id: { in: idsAntigos } } });
  }

  const cfg = await prisma.configuracao.findFirst();
  if (cfg) {
    await prisma.configuracao.update({ where: { id: cfg.id }, data: { ultimoBackupEm: agora } });
  } else {
    await prisma.configuracao.create({ data: { ultimoBackupEm: agora } });
  }

  return caminho;
}

export async function buildBackupWorkbook() {
  const wb = XLSX.utils.book_new();

  const [
    clientes, empreendimentos, processos, exigencias, financeiros, contratos, controlesDmr,
    tarefas, usuarios, acessos, propostas, responsaveis, orgaos, residuosItems,
    residuosAnuais, empresasContratadas, documentos, historicos, configuracoes, modelosProposta,
  ] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { id: "asc" } }),
    prisma.empreendimento.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.processo.findMany({
      include: {
        empreendimento: { select: { apelido: true, cliente: { select: { apelido: true } } } },
        orgao: { select: { sigla: true, nome: true } },
        responsavel: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.exigencia.findMany({
      include: {
        processo: {
          select: {
            numProtocolo: true,
            empreendimento: { select: { apelido: true, cliente: { select: { apelido: true } } } },
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.financeiro.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.contrato.findMany({
      include: { cliente: { select: { apelido: true } }, empreendimento: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.controleDmr.findMany({
      include: { empreendimento: { select: { apelido: true, cliente: { select: { apelido: true } } } } },
      orderBy: { id: "asc" },
    }),
    prisma.tarefa.findMany({
      include: {
        responsavel: { select: { nome: true } },
        usuario: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true, atualizadoEm: true, cpf: true, conselho: true, termosAceitosEm: true },
      orderBy: { id: "asc" },
    }),
    prisma.acesso.findMany({
      include: { cliente: { select: { apelido: true } }, empreendimento: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.proposta.findMany({
      include: { cliente: { select: { apelido: true } }, empreendimento: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.responsavel.findMany({
      include: { usuario: { select: { nome: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.orgao.findMany({ orderBy: { id: "asc" } }),
    prisma.residuoItem.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.residuoAnual.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.empresaContratada.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.documento.findMany({
      select: { id: true, nome: true, tipo: true, caminho: true, tamanho: true, criadoEm: true, ativo: true, processoId: true, exigenciaId: true, clienteId: true },
      orderBy: { id: "asc" },
    }),
    prisma.historico.findMany({
      include: { cliente: { select: { apelido: true } }, empreendimento: { select: { apelido: true } }, usuario: { select: { nome: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.configuracao.findMany({ orderBy: { id: "asc" } }),
    prisma.propostaModelo.findMany({
      select: { id: true, slug: true, nome: true, descricao: true, prefixoArquivo: true, campos: true, ativo: true, criadoEm: true, atualizadoEm: true },
      orderBy: { id: "asc" },
    }),
  ]);

  addSheet(wb, "Clientes", clientes.map((c) => ({
    ID: c.id,
    Apelido: c.apelido,
    "Razão Social": c.razaoSocial,
    "Nome Fantasia": c.nomeFantasia || "",
    CNPJ: c.cnpj,
    "Inscrição Estadual": c.inscricaoEstadual || "",
    Telefone: c.telefone,
    Email: c.email,
    "Resp. Legal": c.respLegal,
    "Representante Legal": c.representanteLegalNome || "",
    "CPF Rep. Legal": c.representanteLegalCpf || "",
    CEP: c.cep || "",
    Rua: c.rua || "",
    Número: c.numero || "",
    Bairro: c.bairro || "",
    Complemento: c.complemento || "",
    Município: c.municipio || "",
    UF: c.uf || "",
    "Ramo de Atividade": c.ramoAtividade || "",
    "Resp. Técnico Nome": c.responsavelTecnicoNome || "",
    Tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
    Latitude: c.latitude ?? "",
    Longitude: c.longitude ?? "",
    Visibilidade: c.visibilidade,
    Ativo: fmtSimNao(c.ativo),
    CriadoEm: fmtDataHora(c.criadoEm),
    AtualizadoEm: fmtDataHora(c.updatedAt),
  })));

  addSheet(wb, "Empreendimentos", empreendimentos.map((e) => ({
    ID: e.id,
    Cliente: e.cliente.apelido,
    Apelido: e.apelido,
    Descrição: e.descricao,
    CNPJ: e.cnpj || "",
    CEP: e.cep || "",
    Rua: e.rua || "",
    Número: e.numero || "",
    Bairro: e.bairro || "",
    Complemento: e.complemento || "",
    Município: e.municipio || "",
    UF: e.uf || "",
    Latitude: e.latitude ?? "",
    Longitude: e.longitude ?? "",
    "UTM Hemisfério": e.utmHemisferio || "",
    "UTM X": e.utmX ?? "",
    "UTM Y": e.utmY ?? "",
    "UTM Zona": e.utmZona ?? "",
    Visibilidade: e.visibilidade,
    Ativo: fmtSimNao(e.ativo),
    CriadoEm: fmtDataHora(e.criadoEm),
  })));

  addSheet(wb, "Processos", processos.map((p) => ({
    ID: p.id,
    Cliente: p.empreendimento.cliente.apelido,
    Empreendimento: p.empreendimento.apelido,
    Tipo: p.tipo,
    Sistema: p.sistema,
    Órgão: p.orgao ? `${p.orgao.sigla} - ${p.orgao.nome}` : "",
    "Nº Protocolo": p.numProtocolo,
    "Nº Licença": p.numLicenca || "",
    Status: p.status,
    "Data Protocolo": fmtData(p.dataProtocolo),
    "Data Contato": fmtData(p.dataContato),
    Validade: fmtData(p.validade),
    "Dias p/ Validade": diasAte(p.validade),
    Responsável: p.responsavel?.nome || "",
    Condicionantes: p.condicionantes || "",
    Observações: p.observacoes || "",
    "Alerta Dias": p.alertaDias,
    Ativo: fmtSimNao(p.ativo),
    CriadoEm: fmtDataHora(p.criadoEm),
  })));

  addSheet(wb, "Exigências", exigencias.map((x) => ({
    ID: x.id,
    Cliente: x.processo?.empreendimento?.cliente?.apelido || "",
    Empreendimento: x.processo?.empreendimento?.apelido || "",
    "Nº Protocolo": x.processo?.numProtocolo || "",
    Descrição: x.descricao,
    Prazo: fmtData(x.prazo),
    "Dias p/ Prazo": diasAte(x.prazo),
    "Antecedência Dias": x.antecedenciaDias,
    Cumprida: fmtSimNao(x.cumprida),
    Ativo: fmtSimNao(x.ativo),
    CriadoEm: fmtDataHora(x.criadoEm),
  })));

  addSheet(wb, "Financeiro", financeiros.map((f) => ({
    ID: f.id,
    Cliente: f.cliente.apelido,
    "Tipo de Cobrança": f.tipoCobranca,
    Valor: f.valor,
    "Forma de Pagamento": f.formaPagamento,
    "Status Pagamento": f.statusPagamento,
    "Data Vencimento": fmtData(f.dataVencimento),
    "Dias p/ Vencimento": diasAte(f.dataVencimento),
    "Data Pagamento": fmtData(f.dataPagamento),
    Descrição: f.descricao || "",
    Ativo: fmtSimNao(f.ativo),
    CriadoEm: fmtDataHora(f.criadoEm),
  })));

  addSheet(wb, "Contratos", contratos.map((c) => ({
    ID: c.id,
    Cliente: c.cliente.apelido,
    Empreendimento: c.empreendimento?.apelido || "",
    "Serviço/Processo": c.servicoProcesso,
    "Data Assinatura": fmtData(c.dataAssinatura),
    "Data Validade": fmtData(c.dataValidade),
    "Dias p/ Validade": diasAte(c.dataValidade),
    "Alerta Renovação Dias": c.alertaRenovacaoDias,
    Ativo: fmtSimNao(c.ativo),
    CriadoEm: fmtDataHora(c.criadoEm),
  })));

  addSheet(wb, "Controle DMR", controlesDmr.map((c) => ({
    ID: c.id,
    Cliente: c.empreendimento.cliente.apelido,
    Empreendimento: c.empreendimento.apelido,
    Ano: c.ano,
    "1º Trim DMR": c.t1Dmr,
    "1º Trim MTR": c.t1Mtr,
    "2º Trim DMR": c.t2Dmr,
    "2º Trim MTR": c.t2Mtr,
    "3º Trim DMR": c.t3Dmr,
    "3º Trim MTR": c.t3Mtr,
    "4º Trim DMR": c.t4Dmr,
    "4º Trim MTR": c.t4Mtr,
    CriadoEm: fmtDataHora(c.criadoEm),
  })));

  addSheet(wb, "Tarefas", tarefas.map((t) => ({
    ID: t.id,
    Título: t.titulo,
    Descrição: t.descricao || "",
    Status: t.status,
    Prioridade: t.prioridade,
    "Data Vencimento": fmtData(t.dataVencimento),
    "Dias p/ Vencimento": diasAte(t.dataVencimento),
    Responsável: t.responsavel?.nome || "",
    Usuário: t.usuario?.nome || "",
    Observações: t.statusObs || "",
    Ativo: fmtSimNao(t.ativo),
    CriadoEm: fmtDataHora(t.criadoEm),
  })));

  addSheet(wb, "Usuários", usuarios.map((u) => ({
    ID: u.id,
    Nome: u.nome,
    Email: u.email,
    Perfil: u.perfil,
    CPF: u.cpf || "",
    Conselho: u.conselho || "",
    Ativo: fmtSimNao(u.ativo),
    "Termos Aceitos Em": fmtDataHora(u.termosAceitosEm),
    CriadoEm: fmtDataHora(u.criadoEm),
    AtualizadoEm: fmtDataHora(u.atualizadoEm),
  })));

  addSheet(wb, "Acessos", acessos.map((a) => ({
    ID: a.id,
    Login: a.login,
    Descrição: a.descricao,
    Cliente: a.cliente?.apelido || "",
    Empreendimento: a.empreendimento?.apelido || "",
    CriadoEm: fmtDataHora(a.criadoEm),
  })));

  addSheet(wb, "Propostas", propostas.map((p) => ({
    ID: p.id,
    Título: p.titulo,
    Cliente: p.cliente.apelido,
    Empreendimento: p.empreendimento?.apelido || "",
    Valor: p.valor ?? "",
    Status: p.status,
    "Validade Dias": p.validadeDias,
    Serviços: fmtJson(p.servicos),
    Observações: p.observacoes || "",
    CriadoEm: fmtDataHora(p.criadoEm),
    AtualizadoEm: fmtDataHora(p.atualizadoEm),
  })));

  addSheet(wb, "Responsáveis", responsaveis.map((r) => ({
    ID: r.id,
    Nome: r.nome,
    Email: r.email,
    Telefone: r.telefone || "",
    Função: r.funcao,
    "Carga Horária": r.cargaHoras,
    Usuário: r.usuario?.nome || "",
    CriadoEm: fmtDataHora(r.criadoEm),
  })));

  addSheet(wb, "Órgãos", orgaos.map((o) => ({
    ID: o.id,
    Nome: o.nome,
    Sigla: o.sigla,
  })));

  addSheet(wb, "Resíduos Item", residuosItems.map((r) => ({
    ID: r.id,
    Cliente: r.cliente.apelido,
    Categoria: r.categoria,
    Ordem: r.ordem,
    "Ponto de Geração": r.pontoGeracao || "",
    "Resíduos Gerados": r.residuosGerados || "",
    Quantificação: r.quantificacao || "",
    Acondicionamento: r.acondicionamento || "",
    Armazenamento: r.armazenamento || "",
    "Coleta Interna": r.coletaInterna || "",
    "Empresa Transporte": r.empresaTransporte || "",
    "Empresa Disposição Final": r.empresaDisposicaoFinal || "",
  })));

  addSheet(wb, "Resíduos Anual", residuosAnuais.map((r) => ({
    ID: r.id,
    Cliente: r.cliente.apelido,
    Categoria: r.categoria,
    Ordem: r.ordem,
    "Ponto de Geração": r.pontoGeracao || "",
    Resíduo: r.residuo || "",
    "Estado Físico": r.estadoFisico || "",
    "Código IBAMA": r.codIbama || "",
    "Classificação Resíduo": r.classificacaoResiduo || "",
    "Código NBR 10004": r.codigoNbr10004 || "",
    "Código Conama LGR": r.codigoConamaLgr || "",
    Entrada: r.entrada || "",
    "Geração Anual": r.geracaoAnual || "",
    Acondicionamento: r.acondicionamento || "",
    Transportadora: r.transportadora || "",
    Tratamento: r.tratamento || "",
    Destino: r.destino || "",
  })));

  addSheet(wb, "Empresas Contratadas", empresasContratadas.map((e) => ({
    ID: e.id,
    Cliente: e.cliente.apelido,
    Ordem: e.ordem,
    "Nome Fantasia": e.nomeFantasia || "",
    "Razão Social": e.razaoSocial || "",
    CNPJ: e.cnpj || "",
    "Nº/Data/Validade Licença": e.numeroDataValidadeLicenca || "",
  })));

  addSheet(wb, "Documentos", documentos.map((d) => ({
    ID: d.id,
    Nome: d.nome,
    Tipo: d.tipo,
    Caminho: d.caminho,
    Tamanho: d.tamanho,
    ProcessoId: d.processoId ?? "",
    ExigenciaId: d.exigenciaId ?? "",
    ClienteId: d.clienteId ?? "",
    Ativo: fmtSimNao(d.ativo),
    CriadoEm: fmtDataHora(d.criadoEm),
  })));

  addSheet(wb, "Históricos", historicos.map((h) => ({
    ID: h.id,
    Descrição: h.descricao,
    Anexo: h.anexo || "",
    Cliente: h.cliente?.apelido || "",
    Empreendimento: h.empreendimento?.apelido || "",
    Usuário: h.usuario?.nome || "",
    CriadoEm: fmtDataHora(h.criadoEm),
  })));

  addSheet(wb, "Configurações", configuracoes.map((c) => ({
    ID: c.id,
    "Nome Empresa": c.nomeEmpresa || "",
    CNPJ: c.cnpj || "",
    "Registro CRQ": c.registroCrq || "",
    "Registro Órgão": c.registroOrgao || "",
    "Responsável Nome": c.responsavelNome || "",
    "Responsável CPF": c.responsavelCpf || "",
    "Responsável Email": c.responsavelEmail || "",
    "Responsável Telefone": c.responsavelTelefone || "",
    "Último Backup Em": fmtDataHora(c.ultimoBackupEm),
    AtualizadoEm: fmtDataHora(c.atualizadoEm),
  })));

  addSheet(wb, "Modelos de Proposta", modelosProposta.map((m) => ({
    ID: m.id,
    Slug: m.slug,
    Nome: m.nome,
    Descrição: m.descricao,
    "Prefixo Arquivo": m.prefixoArquivo,
    Campos: fmtJson(m.campos),
    Ativo: fmtSimNao(m.ativo),
    CriadoEm: fmtDataHora(m.criadoEm),
    AtualizadoEm: fmtDataHora(m.atualizadoEm),
  })));

  return wb;
}
