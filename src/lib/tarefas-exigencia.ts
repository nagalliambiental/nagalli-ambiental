import { prisma } from "@/lib/prisma";

export async function criarExigenciaEspelhada(opts: {
  processoId: number;
  titulo: string;
  descricao?: string | null;
  prazoFinal: Date | null;
  alertaPrazoFinal: number;
}): Promise<number> {
  const prazo =
    opts.prazoFinal ??
    new Date(Date.now() + Math.max(opts.alertaPrazoFinal, 0) * 86400000);

  const exigencia = await prisma.exigencia.create({
    data: {
      descricao: opts.descricao ? `${opts.titulo} — ${opts.descricao}` : opts.titulo,
      prazo,
      antecedenciaDias: Math.max(opts.alertaPrazoFinal, 0),
      processoId: opts.processoId,
    },
    select: { id: true },
  });
  return exigencia.id;
}

export async function sincronizarExigenciaTarefa(tarefa: {
  exigenciaId: number | null;
  status: string;
}): Promise<void> {
  if (!tarefa.exigenciaId) return;
  const cumprida = tarefa.status === "concluida";
  await prisma.exigencia.updateMany({
    where: { id: tarefa.exigenciaId },
    data: { cumprida },
  });
}
