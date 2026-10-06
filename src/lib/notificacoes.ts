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
 * Notifica a criação de uma tarefa: se o responsável estiver vinculado a um
 * usuário, a notificação é direcionada a ele; caso contrário, fica global.
 * O criador não recebe notificação quando ele mesmo é o responsável.
 */
export async function notificarTarefaNova(tarefa: {
  id: number;
  titulo: string;
  responsavelId: number;
  criadoPorUsuarioId?: number | null;
}): Promise<void> {
  try {
    const responsavel = await prisma.responsavel.findUnique({
      where: { id: tarefa.responsavelId },
      select: { nome: true, usuarioId: true },
    });
    if (!responsavel) return;
    const dono = responsavel.usuarioId;
    if (dono && tarefa.criadoPorUsuarioId && dono === tarefa.criadoPorUsuarioId) return;
    await criarNotificacao({
      tipo: "tarefa_nova",
      mensagem: dono
        ? `Nova tarefa: ${tarefa.titulo}`
        : `Nova tarefa: ${tarefa.titulo} (para ${responsavel.nome})`,
      url: `/tarefas/${tarefa.id}`,
      tarefaId: tarefa.id,
      destinatarioUsuarioId: dono,
      dataEvento: new Date(),
    });
  } catch (e) {
    console.error("Erro ao criar notificação de tarefa nova:", e);
  }
}
