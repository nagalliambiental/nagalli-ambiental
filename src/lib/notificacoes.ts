import { prisma } from "@/lib/prisma";

export type NotificacaoEntrada = {
  tipo: string;
  mensagem: string;
  url?: string | null;
  tarefaId?: number | null;
  destinatarioUsuarioId?: number | null;
  dataEvento?: Date | null;
};

/**
 * Cria uma notificação in-app. Com `dedupe`, não repete notificação não lida
 * de mesmo tipo e mensagem (mesma regra do aam-nagalli para normas do IAT).
 */
export async function criarNotificacao(n: NotificacaoEntrada, dedupe = false): Promise<void> {
  if (dedupe) {
    const ja = await prisma.notificacao.findFirst({
      where: { tipo: n.tipo, mensagem: n.mensagem, lida: false },
      select: { id: true },
    });
    if (ja) return;
  }
  await prisma.notificacao.create({
    data: {
      tipo: n.tipo,
      mensagem: n.mensagem,
      url: n.url ?? null,
      tarefaId: n.tarefaId ?? null,
      destinatarioUsuarioId: n.destinatarioUsuarioId ?? null,
      dataEvento: n.dataEvento ?? null,
    },
  });
}

/**
 * Notifica a criação de uma tarefa: todos os responsáveis vinculados a um
 * usuário são notificados (exceto o criador); se ninguém tem usuário,
 * a notificação fica global. O criador nunca recebe notificação própria.
 */
export async function notificarTarefaNova(tarefa: {
  id: number;
  titulo: string;
  responsavelId: number;
  criadoPorUsuarioId?: number | null;
}): Promise<void> {
  try {
    const [responsavel, extras] = await Promise.all([
      prisma.responsavel.findUnique({
        where: { id: tarefa.responsavelId },
        select: { nome: true, usuarioId: true },
      }),
      prisma.tarefaResponsavel.findMany({
        where: { tarefaId: tarefa.id },
        select: { responsavel: { select: { nome: true, usuarioId: true } } },
      }),
    ]);
    if (!responsavel) return;
    const alvos = new Map<number, string>();
    if (responsavel.usuarioId) alvos.set(responsavel.usuarioId, responsavel.nome);
    for (const e of extras) {
      if (e.responsavel.usuarioId) alvos.set(e.responsavel.usuarioId, e.responsavel.nome);
    }
    if (tarefa.criadoPorUsuarioId) alvos.delete(tarefa.criadoPorUsuarioId);
    if (alvos.size === 0) {
      await criarNotificacao({
        tipo: "tarefa_nova",
        mensagem: `Nova tarefa: ${tarefa.titulo} (para ${responsavel.nome})`,
        url: `/tarefas/${tarefa.id}`,
        tarefaId: tarefa.id,
        destinatarioUsuarioId: null,
        dataEvento: new Date(),
      });
      return;
    }
    for (const dono of alvos.keys()) {
      await criarNotificacao({
        tipo: "tarefa_nova",
        mensagem: `Nova tarefa: ${tarefa.titulo}`,
        url: `/tarefas/${tarefa.id}`,
        tarefaId: tarefa.id,
        destinatarioUsuarioId: dono,
        dataEvento: new Date(),
      });
    }
  } catch (e) {
    console.error("Erro ao criar notificação de tarefa nova:", e);
  }
}
