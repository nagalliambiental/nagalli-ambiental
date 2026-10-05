import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { requerAutenticado } from "@/lib/perfil";

export async function POST(req: Request) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const body = await req.json().catch(() => ({}));
  const importId = String(body.importId ?? "");
  if (!importId) return NextResponse.json({ error: "importId não informado" }, { status: 400 });

  try {
    const tarefas = await prisma.tarefa.findMany({
      where: { importId, ativo: true },
      select: { id: true, exigenciaId: true },
    });
    if (tarefas.length === 0) {
      return NextResponse.json({ error: "Nenhuma tarefa encontrada para este lote." }, { status: 404 });
    }
    const exigenciaIds = tarefas.map((t) => t.exigenciaId).filter((x): x is number => x != null);

    await prisma.$transaction([
      prisma.tarefa.updateMany({ where: { importId }, data: { ativo: false } }),
      ...(exigenciaIds.length
        ? [prisma.exigencia.updateMany({ where: { id: { in: exigenciaIds } }, data: { ativo: false, cumprida: false } })]
        : []),
    ]);

    await logAuditoria("excluir", "tarefa", 0, { desfazerImportacao: importId, removidas: tarefas.length }, Number((authResult.user as { id: string }).id));

    return NextResponse.json({ removidas: tarefas.length });
  } catch (e) {
    console.error("Erro ao desfazer importação:", e);
    return NextResponse.json({ error: "Erro ao desfazer importação." }, { status: 500 });
  }
}
