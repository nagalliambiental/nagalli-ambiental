import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.titulo === "string" && body.titulo.trim()) data.titulo = body.titulo.trim().slice(0, 200);
  if (typeof body?.descricao === "string") data.descricao = body.descricao.slice(0, 1000);
  if (typeof body?.cumprida === "boolean") data.cumprida = body.cumprida;
  if (body?.tipo === "informativa" || body?.tipo === "exigencia") data.tipo = body.tipo;
  if (body?.prazo === null) {
    data.prazo = null;
  } else if (typeof body?.prazo === "string" && body.prazo) {
    const d = new Date(body.prazo);
    if (!isNaN(d.getTime())) data.prazo = d;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const item = await prisma.condicionante.update({
    where: { id: Number(id) },
    data,
  });

  await logAuditoria("editar", "Condicionante", item.id, data);
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.condicionante.delete({ where: { id: Number(id) } });
  await logAuditoria("excluir", "Condicionante", Number(id), {});
  return NextResponse.json({ ok: true });
}
