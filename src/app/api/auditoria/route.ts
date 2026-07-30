import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-static";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const entidade = url.searchParams.get("entidade") || undefined;
  const acao = url.searchParams.get("acao") || undefined;

  const where: Record<string, unknown> = {};
  if (entidade) where.entidade = entidade;
  if (acao) where.acao = acao;

  const [total, logs] = await Promise.all([
    prisma.logAuditoria.count({ where }),
    prisma.logAuditoria.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { usuario: { select: { nome: true, email: true } } },
    }),
  ]);

  return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
}
