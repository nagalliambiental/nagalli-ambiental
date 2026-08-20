import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conexaoId = req.nextUrl.searchParams.get("conexaoId");
  const apenasPendentes = req.nextUrl.searchParams.get("pendentes") === "1";
  const apenasCertificados = req.nextUrl.searchParams.get("certificados") === "1";

  const where: Record<string, unknown> = {};
  if (conexaoId) where.conexaoId = Number(conexaoId);
  if (apenasPendentes) {
    where.certificado = false;
    where.status = { not: "CANCELADO" };
  }
  if (apenasCertificados) where.certificado = true;

  const manifestos = await prisma.sinirManifesto.findMany({
    where,
    include: { conexao: { select: { id: true, nome: true, modo: true } } },
    orderBy: { dataExpedicao: "desc" },
    take: 300,
  });

  return NextResponse.json(manifestos);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const perfil = (session?.user as { perfil?: string } | undefined)?.perfil;
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (perfil !== "socio" && perfil !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const conexaoId = req.nextUrl.searchParams.get("conexaoId");
  if (!conexaoId) {
    return NextResponse.json({ error: "Parâmetro conexaoId é obrigatório" }, { status: 400 });
  }

  const result = await prisma.sinirManifesto.deleteMany({
    where: { conexaoId: Number(conexaoId) },
  });

  return NextResponse.json({ removed: result.count });
}