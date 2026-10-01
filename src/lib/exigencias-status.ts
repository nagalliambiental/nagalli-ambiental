import { prisma } from "@/lib/prisma";

const STATUS_PROTEGIDO = ["arquivado", "encerrado", "indeferido", "cancelado"];
const STATUS_EXIGENCIA_RECEBIDA = "exigencia_recebida";

/**
 * Sincroniza o status do processo (licença) com o estado das exigências:
 * - Havendo exigência pendente, muda o status para "exigencia_recebida"
 *   guardando o status anterior (não altera processos com status final).
 * - Sem exigências pendentes, restaura o status anterior salvo.
 * Deve ser chamada após criar, atualizar ou excluir exigências.
 */
export async function sincronizarStatusProcessoPorExigencias(processoId: number) {
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { status: true, statusAnteriorExigencia: true },
  });
  if (!processo) return;

  const pendentes = await prisma.exigencia.count({
    where: { processoId, cumprida: false },
  });

  if (pendentes > 0) {
    if (processo.status === STATUS_EXIGENCIA_RECEBIDA || STATUS_PROTEGIDO.includes(processo.status)) return;
    await prisma.processo.update({
      where: { id: processoId },
      data: { status: STATUS_EXIGENCIA_RECEBIDA, statusAnteriorExigencia: processo.status },
    });
    return;
  }

  if (processo.status !== STATUS_EXIGENCIA_RECEBIDA || !processo.statusAnteriorExigencia) return;
  await prisma.processo.update({
    where: { id: processoId },
    data: { status: processo.statusAnteriorExigencia, statusAnteriorExigencia: null },
  });
}
