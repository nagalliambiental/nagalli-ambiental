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
