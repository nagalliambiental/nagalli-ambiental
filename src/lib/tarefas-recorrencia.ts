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

export async function criarSerie(
  recorrencia: RecorrenciaTarefa,
  periodos: PeriodoEntrada[]
): Promise<number> {
  const norm = normalizarPeriodos(periodos);
  if (!norm.ok) throw new Error(norm.erro);
  const serie = await prisma.tarefaSerie.create({
    data: {
      recorrencia,
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
  periodos: PeriodoEntrada[]
): Promise<void> {
  const norm = normalizarPeriodos(periodos);
  if (!norm.ok) throw new Error(norm.erro);
  await prisma.tarefaSerie.update({
    where: { id: serieId },
    data: {
      recorrencia,
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
 * Ao concluir uma tarefa recorrente, cria a próxima ocorrência:
 * prazo avança pela frequência e o responsável sai da escala por período
 * (mantém o atual se nenhum período cobrir a nova data).
 */
export async function gerarProximaOcorrencia(tarefa: TarefaClone, usuarioId: number): Promise<number | null> {
  if (!tarefa.serieId) return null;
  const serie = await prisma.tarefaSerie.findUnique({
    where: { id: tarefa.serieId },
    include: { periodos: true },
  });
  if (!serie || !ehRecorrenciaValida(serie.recorrencia)) return null;

  const base = tarefa.prazoFinal ?? tarefa.dataConclusao ?? new Date();
  const novoPrazo = proximaData(base, serie.recorrencia);
  const responsavelId =
    responsavelParaData(serie.periodos, novoPrazo) ?? tarefa.responsavelId;

  const existente = await prisma.tarefa.findFirst({
    where: { serieId: serie.id, prazoFinal: novoPrazo, ativo: true },
    select: { id: true },
  });
  if (existente) return null;

  const nova = await prisma.tarefa.create({
    data: {
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      observacoes: tarefa.observacoes,
      status: STATUS_TAREFA.NAO_INICIADO,
      prioridade: tarefa.prioridade,
      prazoFinal: novoPrazo,
      alertaPrazoFinal: tarefa.alertaPrazoFinal,
      dataLimite: tarefa.dataLimite,
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
