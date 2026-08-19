import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const entidade = url.searchParams.get("entidade") || undefined;
  const acao = url.searchParams.get("acao") || undefined;
  const usuarioId = url.searchParams.get("usuarioId") || undefined;
  const dataInicio = url.searchParams.get("dataInicio") || undefined;
  const dataFim = url.searchParams.get("dataFim") || undefined;

  const where: Record<string, unknown> = {};
  if (entidade) where.entidade = entidade;
  if (acao) where.acao = acao;
  if (usuarioId) where.usuarioId = Number(usuarioId);

  if (dataInicio || dataFim) {
    where.criadoEm = {
      ...(dataInicio ? { gte: new Date(`${dataInicio}T00:00:00`) } : {}),
      ...(dataFim ? { lte: new Date(`${dataFim}T23:59:59.999`) } : {}),
    };
  }

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