import { prisma } from "@/lib/prisma";

export async function getUltimaModificacao(entidade: string, entidadeId: number) {
  return prisma.logAuditoria.findFirst({
    where: {
      entidade: { contains: entidade, mode: "insensitive" },
      entidadeId,
    },
    orderBy: { criadoEm: "desc" },
    include: { usuario: { select: { nome: true } } },
  });
}
