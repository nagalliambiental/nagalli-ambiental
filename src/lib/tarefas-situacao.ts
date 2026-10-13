export type SituacaoTarefa =
  | "concluida"
  | "aguardando"
  | "atrasada"
  | "vence_em"
  | "no_prazo"
  | "sem_prazo";

export interface EntradaSituacaoTarefa {
  status: string;
  substatus?: string | null;
  prazoFinal?: Date | string | null;
  alertaPrazoFinal?: number | null;
}

function diasAtePrazo(prazoFinal: Date | string, agora: Date): number | null {
  const d = prazoFinal instanceof Date ? prazoFinal : new Date(prazoFinal);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - agora.getTime()) / 86400000);
}

/**
 * Situação exibida da tarefa. Tarefa com substatus (aguardando/pausada) e não
 * concluída nunca é "atrasada": o prazo fica pausado enquanto aguarda terceiros.
 */
export function situacaoTarefa(
  t: EntradaSituacaoTarefa,
  agora: Date = new Date()
): { situacao: SituacaoTarefa; dias: number | null } {
  if (t.status === "concluida") return { situacao: "concluida", dias: null };
  if (t.substatus) {
    const dias = t.prazoFinal ? diasAtePrazo(t.prazoFinal, agora) : null;
    return { situacao: "aguardando", dias };
  }
  if (!t.prazoFinal) return { situacao: "sem_prazo", dias: null };
  const dias = diasAtePrazo(t.prazoFinal, agora);
  if (dias === null) return { situacao: "sem_prazo", dias: null };
  if (dias < 0) return { situacao: "atrasada", dias };
  if (dias <= (t.alertaPrazoFinal ?? 30)) return { situacao: "vence_em", dias };
  return { situacao: "no_prazo", dias };
}

/** Dias desde que a tarefa entrou em espera (0 quando sem data). */
export function diasAguardando(
  aguardandoDesde: Date | string | null | undefined,
  agora: Date = new Date()
): number {
  if (!aguardandoDesde) return 0;
  const d = aguardandoDesde instanceof Date ? aguardandoDesde : new Date(aguardandoDesde);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((agora.getTime() - d.getTime()) / 86400000));
}
