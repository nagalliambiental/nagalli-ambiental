import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MtrImaError } from "@/lib/mtr-ima";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const str = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s ? s : null;
    };
    const digits = (v: unknown) => {
      const s = String(v ?? "").replace(/\D/g, "");
      return s ? s : null;
    };
    const num = (v: unknown) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const data: Record<string, unknown> = {};
    const camposStr = [
      "nome",
      "descricao",
      "clienteNome",
      "empreendNome",
      "nomeResponsavel",
      "cargoResponsavel",
      "transportadorNome",
      "destinadorNome",
      "armazenadorNome",
      "nomeMotorista",
      "placaVeiculo",
      "observacoes",
    ];
    for (const c of camposStr) if (c in body) data[c] = str(body[c]);
    const camposCnpj = ["transportadorCnpj", "destinadorCnpj", "armazenadorCnpj"];
    for (const c of camposCnpj) if (c in body) data[c] = digits(body[c]);
    const camposNum = ["transportadorUnidade", "destinadorUnidade", "codigoPortal"];
    for (const c of camposNum) if (c in body) data[c] = num(body[c]);
    if ("conexaoId" in body) data.conexaoId = body.conexaoId ? Number(body.conexaoId) : null;
    if ("residuos" in body) data.residuos = Array.isArray(body.residuos) ? body.residuos : [];
    const modelo = await prisma.mtrImaModelo.update({ where: { id: Number(id) }, data });
    return NextResponse.json(modelo);
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao atualizar modelo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.mtrImaModelo.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof MtrImaError ? e.message : "Erro ao remover modelo";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
