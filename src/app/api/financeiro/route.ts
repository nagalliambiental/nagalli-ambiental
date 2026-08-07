import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerPerfil } from "@/lib/perfil";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const financeiros = await prisma.financeiro.findMany({
    include: { cliente: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(financeiros);
}

export async function POST(request: Request) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  try {
    const data = await request.json();
    const financeiro = await prisma.financeiro.create({ data });

    await logAuditoria(
      "criar",
      "financeiro",
      financeiro.id,
      data,
      Number(user.id)
    );

    return NextResponse.json(financeiro, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar registro financeiro:", error);
    return NextResponse.json(
      { error: "Erro ao criar registro financeiro" },
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
    await prisma.financeiro.deleteMany({ where: { id: { in: ids.split(",").map(Number) } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao remover registros financeiros:", e);
    return NextResponse.json({ error: "Erro ao remover. Verifique se há registros vinculados." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;
  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  const body = await req.json();
  await prisma.financeiro.updateMany({ where: { id: { in: ids.split(",").map(Number) } }, data: body });
  return NextResponse.json({ ok: true });
}
