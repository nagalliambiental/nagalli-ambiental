import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const INTERVALO_BACKUP_DIAS = 15;

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

function addSheet(wb: XLSX.WorkBook, nome: string, linhas: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(linhas);
  ws["!cols"] = [];
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

  const [clientes, empreendimentos, processos, exigencias, financeiros, contratos, orgaos,
    responsaveis, tarefas, documentos, documentosGerados, residuos, residuosAnuais,
    empresasContratadas, controlesDmr, autorizacoesCorte, alertas, historicos, acessos,
    propostas, usuarios, propostaServicos, propostaModelos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { id: "asc" } }),
    prisma.empreendimento.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.processo.findMany({
      include: {
        empreendimento: { select: { apelido: true } },
        orgao: { select: { sigla: true, nome: true } },
        responsavel: { select: { nome: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.exigencia.findMany({
      include: {
        processo: {
          select: { numProtocolo: true, empreendimento: { select: { apelido: true } } },
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
    prisma.orgao.findMany({ orderBy: { id: "asc" } }),
    prisma.responsavel.findMany({
      include: { usuario: { select: { nome: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.tarefa.findMany({
      include: { responsavel: { select: { nome: true } }, usuario: { select: { nome: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.documento.findMany({
      include: {
        cliente: { select: { apelido: true } },
        processo: { select: { numProtocolo: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.documentoGerado.findMany({
      include: { cliente: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
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
    prisma.controleDmr.findMany({
      include: { empreendimento: { select: { apelido: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.autorizacaoCorte.findMany({
      include: { processo: { select: { numProtocolo: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.alerta.findMany({ orderBy: { id: "asc" } }),
    prisma.historico.findMany({
      include: {
        cliente: { select: { apelido: true } },
        empreendimento: { select: { apelido: true } },
        usuario: { select: { nome: true } },
      },
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
    prisma.usuario.findMany({ orderBy: { id: "asc" } }),
    prisma.propostaServico.findMany({ orderBy: { id: "asc" } }),
    prisma.propostaModelo.findMany({ orderBy: { id: "asc" } }),
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
    "Indicação Fiscal": c.indicacaoFiscal || "",
    "Dias de Funcionamento": c.diasFuncionamento || "",
    "Horários": c.horariosFuncionamento || "",
    "Área Construída": c.areaConstruida || "",
    "Nº Colaboradores": c.numeroColaboradores || "",
    "Porte Colaboradores": c.porteColaboradores || "",
    "Possui Refeitório": fmtSimNao(c.possuiRefeitorio),
    "Refeições Diárias": c.refeicoesDiarias || "",
    "Unidades/Dia": c.unidadesDia || "",
    "Preparo Refeições": c.preparoRefeicoes || "",
    "Resp. PGRS Nome": c.responsavelPgrsNome || "",
    "Resp. PGRS Cargo": c.responsavelPgrsCargo || "",
    "Resp. Técnico Nome": c.responsavelTecnicoNome || "",
    "Resp. Técnico Conselho": c.responsavelTecnicoConselho || "",
    "Resp. Técnico CPF": c.responsavelTecnicoCpf || "",
    "Resp. Gestão 1": c.responsavelGestao1Nome || "",
    "Resp. Gestão 1 Telefone": c.responsavelGestao1Telefone || "",
    "Resp. Gestão 1 Email": c.responsavelGestao1Email || "",
    "Resp. Gestão 2": c.responsavelGestao2Nome || "",
    "Resp. Gestão 2 Telefone": c.responsavelGestao2Telefone || "",
    "Resp. Gestão 2 Email": c.responsavelGestao2Email || "",
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
    Polígono: e.poligono || "",
    Visibilidade: e.visibilidade,
    Ativo: fmtSimNao(e.ativo),
    CriadoEm: fmtDataHora(e.criadoEm),
  })));

  addSheet(wb, "Processos", processos.map((p) => ({
    ID: p.id,
    Tipo: p.tipo,
    Sistema: p.sistema,
    "Nº Protocolo": p.numProtocolo,
    "Nº Licença": p.numLicenca || "",
    Status: p.status,
    Órgão: p.orgao ? `${p.orgao.sigla} - ${p.orgao.nome}` : "",
    Empreendimento: p.empreendimento.apelido,
    Responsável: p.responsavel?.nome || "",
    Validade: fmtData(p.validade),
    "Data Protocolo": fmtData(p.dataProtocolo),
    "Data Contato": fmtData(p.dataContato),
    Condicionantes: p.condicionantes || "",
    Observações: p.observacoes || "",
    "Alerta Dias": p.alertaDias,
    Ativo: fmtSimNao(p.ativo),
    CriadoEm: fmtDataHora(p.criadoEm),
  })));

  addSheet(wb, "Exigências", exigencias.map((x) => ({
    ID: x.id,
    "Nº Protocolo": x.processo?.numProtocolo || "",
    Empreendimento: x.processo?.empreendimento?.apelido || "",
    Descrição: x.descricao,
    Prazo: fmtData(x.prazo),
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
    "Alerta Renovação Dias": c.alertaRenovacaoDias,
    Ativo: fmtSimNao(c.ativo),
    CriadoEm: fmtDataHora(c.criadoEm),
  })));

  addSheet(wb, "Órgãos", orgaos.map((o) => ({
    ID: o.id,
    Nome: o.nome,
    Sigla: o.sigla,
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

  addSheet(wb, "Tarefas", tarefas.map((t) => ({
    ID: t.id,
    Título: t.titulo,
    Descrição: t.descricao || "",
    Status: t.status,
    Prioridade: t.prioridade,
    "Data Vencimento": fmtData(t.dataVencimento),
    Responsável: t.responsavel.nome,
    Usuário: t.usuario.nome,
    "Observação Status": t.statusObs || "",
    Ativo: fmtSimNao(t.ativo),
    CriadoEm: fmtDataHora(t.criadoEm),
  })));

  addSheet(wb, "Documentos", documentos.map((d) => ({
    ID: d.id,
    Nome: d.nome,
    Tipo: d.tipo,
    Caminho: d.caminho,
    "Tamanho (KB)": Math.round(d.tamanho / 1024),
    Cliente: d.cliente?.apelido || "",
    "Nº Protocolo": d.processo?.numProtocolo || "",
    Ativo: fmtSimNao(d.ativo),
    CriadoEm: fmtDataHora(d.criadoEm),
  })));

  addSheet(wb, "Documentos Gerados", documentosGerados.map((d) => ({
    ID: d.id,
    Cliente: d.cliente.apelido,
    "Modelo (slug)": d.templateSlug,
    Arquivo: d.caminho || "",
    "Dados (snapshot)": fmtJson(d.dadosSnapshot),
    CriadoEm: fmtDataHora(d.createdAt),
  })));

  addSheet(wb, "Resíduos (PGRS)", residuos.map((r) => ({
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

  addSheet(wb, "Resíduos Anuais", residuosAnuais.map((r) => ({
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
    "Nº/Data Validade Licença": e.numeroDataValidadeLicenca || "",
  })));

  addSheet(wb, "Controle DMR", controlesDmr.map((c) => ({
    ID: c.id,
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

  addSheet(wb, "Autorizações de Corte", autorizacoesCorte.map((a) => ({
    ID: a.id,
    "Nº Protocolo": a.processo.numProtocolo,
    "Qtd Indivíduos": a.quantidadeIndividuos ?? "",
    "Compensação Exigida": fmtSimNao(a.compensacaoExigida),
    "Tipo Compensação": a.tipoCompensacao || "",
    "Qtd Mudas": a.quantidadeMudas ?? "",
    "Área Compensação (m²)": a.areaCompensacaoM2 ?? "",
    "Prazo Compensação": fmtData(a.prazoCompensacao),
    "Status Compensação": a.statusCompensacao,
    Comprovante: a.comprovante || "",
    CriadoEm: fmtDataHora(a.criadoEm),
  })));

  addSheet(wb, "Alertas", alertas.map((a) => ({
    ID: a.id,
    Título: a.titulo,
    Mensagem: a.mensagem,
    Tipo: a.tipo,
    Lido: fmtSimNao(a.lido),
    "Data Disparo": fmtDataHora(a.dataDisparo),
    "Processo ID": a.processoId ?? "",
    "Usuário ID": a.usuarioId ?? "",
    CriadoEm: fmtDataHora(a.criadoEm),
  })));

  addSheet(wb, "Histórico", historicos.map((h) => ({
    ID: h.id,
    Descrição: h.descricao,
    Anexo: h.anexo || "",
    Cliente: h.cliente?.apelido || "",
    Empreendimento: h.empreendimento?.apelido || "",
    Usuário: h.usuario?.nome || "",
    CriadoEm: fmtDataHora(h.criadoEm),
  })));

  addSheet(wb, "Acessos", acessos.map((a) => ({
    ID: a.id,
    Login: a.login,
    Senha: a.senha,
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
  })));

  addSheet(wb, "Usuários", usuarios.map((u) => ({
    ID: u.id,
    Nome: u.nome,
    Email: u.email,
    Perfil: u.perfil,
    Ativo: fmtSimNao(u.ativo),
    CPF: u.cpf || "",
    Conselho: u.conselho || "",
    "Termos Aceitos Em": fmtDataHora(u.termosAceitosEm),
    CriadoEm: fmtDataHora(u.criadoEm),
  })));

  addSheet(wb, "Propostas Serviço (modelo)", propostaServicos.map((p) => ({
    ID: p.id,
    "Modelo Slug": p.modeloSlug,
    Número: p.numero,
    Ano: p.ano,
    Revisão: p.revisao,
    Dados: fmtJson(p.dados),
    CriadoEm: fmtDataHora(p.criadoEm),
  })));

  addSheet(wb, "Propostas Modelos", propostaModelos.map((p) => ({
    ID: p.id,
    Slug: p.slug,
    Nome: p.nome,
    Descrição: p.descricao,
    "Prefixo Arquivo": p.prefixoArquivo,
    Campos: fmtJson(p.campos),
    Ativo: fmtSimNao(p.ativo),
    CriadoEm: fmtDataHora(p.criadoEm),
  })));

  return wb;
}
