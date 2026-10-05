import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { requerAutenticado } from "@/lib/perfil";

type Params = { params: Promise<{ id: string; anexoId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id, anexoId } = await params;
  const anexo = await prisma.tarefaAnexo.findFirst({
    where: { id: Number(anexoId), tarefaId: Number(id), tarefa: { ativo: true } },
  });
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  return new NextResponse(new Uint8Array(anexo.conteudo), {
    headers: {
      "Content-Type": anexo.mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(anexo.nome)}"`,
      "Content-Length": String(anexo.tamanho),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id, anexoId } = await params;
  const anexo = await prisma.tarefaAnexo.findFirst({
    where: { id: Number(anexoId), tarefaId: Number(id), tarefa: { ativo: true } },
    select: { id: true, nome: true },
  });
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  await prisma.tarefaAnexo.delete({ where: { id: anexo.id } });
  await logAuditoria("excluir", "tarefa", Number(id), { anexo: anexo.nome }, Number((authResult.user as { id: string }).id));

  return NextResponse.json({ ok: true });
}
