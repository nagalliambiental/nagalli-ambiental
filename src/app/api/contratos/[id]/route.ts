import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerPerfil } from "@/lib/perfil";
import { logAuditoria } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  return NextResponse.json(contrato);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const { id } = await params;
  const body = await request.json();

  const contrato = await prisma.contrato.update({
    where: { id: Number(id) },
    data: {
      clienteId: Number(body.clienteId),
      servicoProcesso: String(body.servicoProcesso),
      dataAssinatura: new Date(body.dataAssinatura),
      dataValidade: new Date(body.dataValidade),
      alertaRenovacaoDias: Number(body.alertaRenovacaoDias) || 60,
      empreendimentoId: body.empreendimentoId ? Number(body.empreendimentoId) : null,
    },
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });

  await logAuditoria("atualizar", "contrato", contrato.id, body, Number(user.id));
  return NextResponse.json(contrato);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({ where: { id: Number(id) } });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  await prisma.contrato.delete({ where: { id: Number(id) } });

  await logAuditoria("excluir", "contrato", Number(id), { clienteId: contrato.clienteId }, Number(user.id));
  return NextResponse.json({ mensagem: "Contrato excluído" });
}
