import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerPerfil } from "@/lib/perfil";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const contratos = await prisma.contrato.findMany({
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(contratos);
}

export async function POST(request: Request) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  try {
    const body = await request.json();

    if (!body.clienteId || !body.servicoProcesso || !body.dataAssinatura || !body.dataValidade) {
      return NextResponse.json(
        { error: "Cliente, serviço/processo, data de assinatura e data de validade são obrigatórios" },
        { status: 400 }
      );
    }

    const contrato = await prisma.contrato.create({
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

    await logAuditoria(
      "criar",
      "contrato",
      contrato.id,
      body,
      Number(user.id)
    );

    return NextResponse.json(contrato, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar contrato:", error);
    return NextResponse.json(
      { error: "Erro ao criar contrato" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.contrato.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover contratos:", error);
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.contrato.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
