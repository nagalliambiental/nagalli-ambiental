import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const conexaoId = searchParams.get("conexaoId");
    const filter = searchParams.get("pendentes") || searchParams.get("certificados");
    const where: Record<string, unknown> = {};
    if (conexaoId) where.conexaoId = Number(conexaoId);
    if (filter === "1") where.status = "PENDENTE";

    const manifestos = await prisma.mtrImaManifesto.findMany({
      where,
      include: { conexao: { select: { id: true, nome: true } } },
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(manifestos);
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao listar manifestos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const conexaoId = searchParams.get("conexaoId");
    if (id) {
      await prisma.mtrImaManifesto.deleteMany({ where: { id: Number(id) } });
      return NextResponse.json({ ok: true });
    }
    if (conexaoId) {
      const r = await prisma.mtrImaManifesto.deleteMany({ where: { conexaoId: Number(conexaoId) } });
      return NextResponse.json({ ok: true, removidos: r.count });
    }
    return NextResponse.json({ error: "Informe id ou conexaoId" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao excluir manifestos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
