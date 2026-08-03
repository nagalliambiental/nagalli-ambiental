import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";

function isAdmin(perfil?: string) {
  return perfil === "socio" || perfil === "admin";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id: Number(id) },
    include: {
      empreendimento: { select: { id: true, apelido: true } },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  if (!isAdmin(perfil) && contrato.visibilidade !== "publico") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  return NextResponse.json(contrato);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!isAdmin(perfil)) {
    return NextResponse.json({ error: "Acesso restrito a sócios/administradores" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const contrato = await prisma.contrato.update({
    where: { id: Number(id) },
    data: {
      nomeEmpresa: String(body.nomeEmpresa),
      servicoProcesso: String(body.servicoProcesso),
      dataAssinatura: new Date(body.dataAssinatura),
      dataValidade: new Date(body.dataValidade),
      alertaRenovacaoDias: Number(body.alertaRenovacaoDias) || 60,
      visibilidade: body.visibilidade === "publico" ? "publico" : "privado",
      empreendimentoId: body.empreendimentoId ? Number(body.empreendimentoId) : null,
    },
    include: {
      empreendimento: { select: { id: true, apelido: true } },
    },
  });

  await logAuditoria("atualizar", "contrato", contrato.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(contrato);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!isAdmin(perfil)) {
    return NextResponse.json({ error: "Acesso restrito a sócios/administradores" }, { status: 403 });
  }

  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({ where: { id: Number(id) } });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  await prisma.contrato.delete({ where: { id: Number(id) } });

  await logAuditoria("excluir", "contrato", Number(id), { nomeEmpresa: contrato.nomeEmpresa }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Contrato excluído" });
}
