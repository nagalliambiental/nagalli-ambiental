import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";

function isAdmin(perfil?: string) {
  return perfil === "socio" || perfil === "admin";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!isAdmin(perfil)) {
    return NextResponse.json({ error: "Acesso restrito a sócios/administradores" }, { status: 403 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!isAdmin(perfil)) {
    return NextResponse.json({ error: "Acesso restrito a sócios/administradores" }, { status: 403 });
  }

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
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(contrato, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar contrato" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const perfil = (session.user as { perfil?: string }).perfil;
  if (!isAdmin(perfil)) return NextResponse.json({ error: "Acesso restrito a sócios/administradores" }, { status: 403 });

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  try {
    await prisma.contrato.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const perfil = (session.user as { perfil?: string }).perfil;
  if (!isAdmin(perfil)) return NextResponse.json({ error: "Acesso restrito a sócios/administradores" }, { status: 403 });

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.contrato.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
