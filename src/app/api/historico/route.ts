import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const clienteId = url.searchParams.get("clienteId");
  const empreendimentoId = url.searchParams.get("empreendimentoId");

  const where: Record<string, unknown> = {};
  if (clienteId) where.clienteId = Number(clienteId);
  if (empreendimentoId) where.empreendimentoId = Number(empreendimentoId);

  const historicos = await prisma.historico.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: { usuario: { select: { nome: true } } },
  });

  return NextResponse.json(historicos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const descricao = formData.get("descricao") as string;
    if (!descricao?.trim()) return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 });

    const clienteId = formData.get("clienteId") ? Number(formData.get("clienteId")) : null;
    const empreendimentoId = formData.get("empreendimentoId") ? Number(formData.get("empreendimentoId")) : null;
    const file = formData.get("anexo") as File | null;

    let caminhoAnexo: string | null = null;
    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "historico");
      await mkdir(uploadDir, { recursive: true });
      const timestamp = Date.now();
      const safeName = `${timestamp}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, safeName), buffer);
      caminhoAnexo = `/uploads/historico/${safeName}`;
    }

    const historico = await prisma.historico.create({
      data: {
        descricao: descricao.trim(),
        anexo: caminhoAnexo,
        clienteId,
        empreendimentoId,
        usuarioId: Number((session.user as { id: string }).id),
      },
      include: { usuario: { select: { nome: true } } },
    });

    return NextResponse.json(historico, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar histórico" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.historico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
