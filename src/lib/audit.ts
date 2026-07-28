import { prisma } from "./prisma";

export async function logAuditoria(
  acao: string,
  entidade: string,
  entidadeId: number,
  dados?: unknown,
  usuarioId?: number
) {
  await prisma.logAuditoria.create({
    data: {
      acao,
      entidade,
      entidadeId,
      dados: dados ? JSON.stringify(dados) : null,
      usuarioId: usuarioId ?? null,
    },
  });
}
