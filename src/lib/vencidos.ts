import { prisma } from "@/lib/prisma";

export async function atualizarProcessosVencidos() {
  const agora = new Date();
  const vencidos = await prisma.processo.findMany({
    where: { status: "deferido", validade: { lt: agora }, ativo: true },
    select: { id: true },
  });

  if (vencidos.length === 0) return 0;

  await prisma.$transaction([
    prisma.processo.updateMany({
      where: { id: { in: vencidos.map((p) => p.id) } },
      data: { status: "vencido" },
    }),
    ...vencidos.map((p) =>
      prisma.timelineProcesso.create({
        data: {
          status: "vencido",
          descricao: "Licença vencida — status atualizado automaticamente",
          processoId: p.id,
        },
      })
    ),
  ]);

  return vencidos.length;
}