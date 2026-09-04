import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const template = searchParams.get("template") || "";

  const where: Record<string, unknown> = {};
  if (template) where.templateSlug = template;
  if (q) {
    where.cliente = { OR: [
      { apelido: { contains: q, mode: "insensitive" } },
      { razaoSocial: { contains: q, mode: "insensitive" } },
    ]};
  }

  const docs = await prisma.documentoGerado.findMany({
    where,
    include: {
      cliente: { select: { id: true, apelido: true, razaoSocial: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(docs);
}
