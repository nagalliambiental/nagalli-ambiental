import { prisma } from "@/lib/prisma";
import { RECORRENCIA_TAREFA, STATUS_TAREFA, type RecorrenciaTarefa } from "@/lib/constants";
import { logAuditoria } from "@/lib/audit";

export function ehRecorrenciaValida(v: unknown): v is RecorrenciaTarefa {
  return typeof v === "string" && (Object.values(RECORRENCIA_TAREFA) as string[]).includes(v);
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

export function proximaData(base: Date, recorrencia: RecorrenciaTarefa): Date {
  const d = new Date(base);
  switch (recorrencia) {
    case RECORRENCIA_TAREFA.SEMANAL:
      d.setDate(d.getDate() + 7);
      return d;
    case RECORRENCIA_TAREFA.QUINZENAL:
      d.setDate(d.getDate() + 14);
      return d;
    case RECORRENCIA_TAREFA.MENSAL: {
      const dia = d.getDate();
      const mes = d.getMonth() + 1;
      const ano = d.getFullYear() + Math.floor(mes / 12);
      const mesAlvo = mes % 12;
      d.setDate(1);
      d.setMonth(mesAlvo);
      d.setFullYear(ano);
      d.setDate(Math.min(dia, ultimoDiaDoMes(ano, mesAlvo)));
      return d;
    }
    case RECORRENCIA_TAREFA.ANUAL: {
      const dia = d.getDate();
      const mes = d.getMonth();
      const ano = d.getFullYear() + 1;
      d.setDate(1);
      d.setFullYear(ano);
      d.setDate(Math.min(dia, ultimoDiaDoMes(ano, mes)));
      return d;
    }
  }
}

function somaDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function meiaNoite(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diaNumero(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * Prevê a próxima data da regra sem cair no passado (regra do aam-nagalli):
 * se o avanço pela frequência já passou de hoje, conta a partir de hoje.
 */
export function preverProximaData(base: Date, recorrencia: RecorrenciaTarefa, hoje: Date = new Date()): Date {
  const proxima = proximaData(base, recorrencia);
  return diaNumero(proxima) <= diaNumero(hoje) ? proximaData(hoje, recorrencia) : proxima;
}

/**
 * Preserva o intervalo entre prazo final e data limite da ocorrência anterior
 * (mesma regra do aam-nagalli): a data limite acompanha o novo prazo.
 */
export function calcularDataLimite(novoPrazo: Date, prazoFinal: Date | null, dataLimite: Date | null): Date | null {
  if (!dataLimite) return null;
  if (!prazoFinal) return new Date(novoPrazo);
  const offsetDias = Math.round((meiaNoite(dataLimite).getTime() - meiaNoite(prazoFinal).getTime()) / 86400000);
  return somaDias(novoPrazo, offsetDias);
}

export type PeriodoEntrada = { inicio: string | Date; fim: string | Date; responsavelId: number };

export type PeriodoNormalizado = { inicio: Date; fim: Date; responsavelId: number };

function diaDe(v: string | Date): Date {
  const d = typeof v === "string" ? new Date(`${v.slice(0, 10)}T12:00:00`) : new Date(v);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function normalizarPeriodos(periodos: PeriodoEntrada[]): { ok: true; periodos: PeriodoNormalizado[] } | { ok: false; erro: string } {
  const limpos: PeriodoNormalizado[] = [];
  for (const p of periodos) {
    const inicio = diaDe(p.inicio);
    const fim = diaDe(p.fim);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return { ok: false, erro: "Período com data inválida" };
    if (inicio > fim) return { ok: false, erro: "Período: início deve ser anterior ao fim" };
    if (!p.responsavelId) return { ok: false, erro: "Período sem responsável" };
    limpos.push({ inicio, fim, responsavelId: Number(p.responsavelId) });
  }
  limpos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return { ok: true, periodos: limpos };
}

export function responsavelParaData(
  periodos: { inicio: Date; fim: Date; responsavelId: number }[],
  data: Date
): number | null {
  const alvo = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  for (const p of periodos) {
    if (alvo >= p.inicio && alvo <= p.fim) return p.responsavelId;
  }
  return null;
}

export type OpcoesSerie = { ativo?: boolean; fimRecorrencia?: Date | null };

export async function criarSerie(
  recorrencia: RecorrenciaTarefa,
  periodos: PeriodoEntrada[],
  opcoes: OpcoesSerie = {}
): Promise<number> {
  const norm = normalizarPeriodos(periodos);
  if (!norm.ok) throw new Error(norm.erro);
  const serie = await prisma.tarefaSerie.create({
    data: {
      recorrencia,
      ativo: opcoes.ativo ?? true,
      fimRecorrencia: opcoes.fimRecorrencia ?? null,
      periodos: {
        create: norm.periodos.map((p) => ({
          inicio: p.inicio,
          fim: p.fim,
          responsavelId: p.responsavelId,
        })),
      },
    },
  });
  return serie.id;
}

export async function atualizarSerie(
  serieId: number,
  recorrencia: RecorrenciaTarefa,
  periodos: PeriodoEntrada[],
  opcoes: OpcoesSerie = {}
): Promise<void> {
  const norm = normalizarPeriodos(periodos);
  if (!norm.ok) throw new Error(norm.erro);
  await prisma.tarefaSerie.update({
    where: { id: serieId },
    data: {
      recorrencia,
      ...(opcoes.ativo !== undefined ? { ativo: opcoes.ativo } : {}),
      ...(opcoes.fimRecorrencia !== undefined ? { fimRecorrencia: opcoes.fimRecorrencia } : {}),
      periodos: {
        deleteMany: {},
        create: norm.periodos.map((p) => ({
          inicio: p.inicio,
          fim: p.fim,
          responsavelId: p.responsavelId,
        })),
      },
    },
  });
}

type TarefaClone = {
  id: number;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  status: string;
  prioridade: string;
  alertaPrazoFinal: number;
  dataLimite: Date | null;
  alertaDataLimite: number;
  responsavelId: number;
  empreendimentoId: number | null;
  processoId: number | null;
  condicionanteId: number | null;
  usuarioId: number;
  serieId: number | null;
  prazoFinal: Date | null;
  dataConclusao: Date | null;
};

/**
 * Ao concluir uma tarefa recorrente, cria a próxima ocorrência seguindo as
 * regras de negócio do aam-nagalli:
 * - só gera quando a tarefa realmente está concluída;
 * - não gera se a série está pausada (`ativo = false`);
 * - só existe uma ocorrência aberta por série (nenhuma nova se já há outra);
 * - o prazo nunca nasce no passado (conta a partir de hoje se atrasado);
 * - preserva o intervalo prazo final → data limite;
 * - se o novo prazo passar do fim da recorrência, pausa a série e não gera.
 * O responsável sai da escala por período (mantém o atual se nenhum cobrir a nova data).
 */
export async function gerarProximaOcorrencia(tarefa: TarefaClone, usuarioId: number): Promise<number | null> {
  if (!tarefa.serieId) return null;
  if (tarefa.status !== STATUS_TAREFA.CONCLUIDA) return null;
  const serie = await prisma.tarefaSerie.findUnique({
    where: { id: tarefa.serieId },
    include: { periodos: true },
  });
  if (!serie || !ehRecorrenciaValida(serie.recorrencia)) return null;
  if (!serie.ativo) return null;

  const outraAberta = await prisma.tarefa.findFirst({
    where: { serieId: serie.id, id: { not: tarefa.id }, ativo: true, status: { not: STATUS_TAREFA.CONCLUIDA } },
    select: { id: true },
  });
  if (outraAberta) return null;

  const base = tarefa.prazoFinal ?? tarefa.dataConclusao ?? new Date();
  const novoPrazo = preverProximaData(base, serie.recorrencia);

  if (serie.fimRecorrencia && diaNumero(novoPrazo) > diaNumero(serie.fimRecorrencia)) {
    await prisma.tarefaSerie.update({ where: { id: serie.id }, data: { ativo: false } });
    return null;
  }

  const novoDataLimite = calcularDataLimite(novoPrazo, tarefa.prazoFinal, tarefa.dataLimite);
  const responsavelId =
    responsavelParaData(serie.periodos, novoPrazo) ?? tarefa.responsavelId;

  const nova = await prisma.tarefa.create({
    data: {
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      observacoes: tarefa.observacoes,
      status: STATUS_TAREFA.NAO_INICIADO,
      prioridade: tarefa.prioridade,
      prazoFinal: novoPrazo,
      alertaPrazoFinal: tarefa.alertaPrazoFinal,
      dataLimite: novoDataLimite,
      alertaDataLimite: tarefa.alertaDataLimite,
      responsavelId,
      empreendimentoId: tarefa.empreendimentoId,
      processoId: tarefa.processoId,
      condicionanteId: tarefa.condicionanteId,
      usuarioId: tarefa.usuarioId,
      serieId: serie.id,
    },
  });

  await logAuditoria("criar", "tarefa", nova.id, {
    origem: "recorrencia",
    serieId: serie.id,
    tarefaOrigem: tarefa.id,
    prazoFinal: novoPrazo.toISOString(),
  }, usuarioId);

  return nova.id;
}
