import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { getModeloProposta, validarDadosProposta } from "@/lib/propostas/modelos-server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const proposta = await prisma.propostaServico.findUnique({ where: { id: Number(id) } });

  if (!proposta) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(proposta);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.propostaServico.findUnique({ where: { id: Number(id) } });
  if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const modelo = await getModeloProposta(existente.modeloSlug);
  if (!modelo) {
    return NextResponse.json({ error: "Modelo de proposta não encontrado" }, { status: 400 });
  }

  const erros = validarDadosProposta(modelo, body.dados ?? {});
  if (erros.length > 0) {
    return NextResponse.json(
      { error: `Preencha os campos obrigatórios: ${erros.join(", ")}` },
      { status: 400 }
    );
  }

  const isRevision = body.isRevision === true;

  const data = {
    dados: body.dados ?? {},
    revisao: isRevision ? existente.revisao + 1 : existente.revisao,
  };

  const proposta = await prisma.propostaServico.update({
    where: { id: Number(id) },
    data,
  });

  await logAuditoria(isRevision ? "revisar" : "editar", "propostaServico", proposta.id, data, userId);

  return NextResponse.json(proposta);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = Number((session.user as { id?: string }).id);
  const { id } = await params;

  await prisma.propostaServico.delete({ where: { id: Number(id) } });
  await logAuditoria("excluir", "propostaServico", Number(id), {}, userId);

  return NextResponse.json({ ok: true });
}
