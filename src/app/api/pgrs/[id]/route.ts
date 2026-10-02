import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { dataInputParaDate } from "@/lib/format";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const pgrs = await prisma.pgrs.findUnique({
    where: { id: Number(id) },
    include: {
      empreendimento: { select: { id: true, apelido: true, cliente: { select: { id: true, apelido: true } } } },
      cliente: { select: { id: true, apelido: true } },
    },
  });
  if (!pgrs) return NextResponse.json({ error: "PGRS não encontrado" }, { status: 404 });

  return NextResponse.json(pgrs);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const atual = await prisma.pgrs.findUnique({ where: { id: Number(id) } });
  if (!atual) return NextResponse.json({ error: "PGRS não encontrado" }, { status: 404 });

  try {
    const formData = await request.formData();

    const validadeStr = (formData.get("validade") as string) || "";
    const temValidade = formData.has("validade");
    const validade = temValidade ? dataInputParaDate(validadeStr) : atual.validade;
    const validadeOrigem = temValidade
      ? validade
        ? ((formData.get("validadeOrigem") as string) || "manual")
        : null
      : atual.validadeOrigem;

    const data: Record<string, unknown> = {};
    if (formData.has("numero")) data.numero = ((formData.get("numero") as string) || "").trim() || null;
    if (formData.has("orgao")) data.orgao = ((formData.get("orgao") as string) || "").trim() || null;
    if (formData.has("deferidoEm")) data.deferidoEm = dataInputParaDate((formData.get("deferidoEm") as string) || "");
    if (temValidade) {
      data.validade = validade;
      data.validadeOrigem = validadeOrigem;
    }
    if (formData.has("alertaDias")) data.alertaDias = Number(formData.get("alertaDias")) || 180;
    if (formData.has("observacoes")) data.observacoes = ((formData.get("observacoes") as string) || "").trim() || null;

    const file = formData.get("arquivo") as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `pgrs-${Date.now()}-${file.name}`;
      data.arquivoNome = file.name;
      data.arquivoCaminho = `/uploads/${safeName}`;
      data.arquivoConteudo = new Uint8Array(buffer);
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, safeName), buffer);
      } catch {
        // ambiente sem escrita em disco (ex.: Vercel) - o conteúdo fica no banco
      }
    }

    const pgrs = await prisma.pgrs.update({
      where: { id: Number(id) },
      data,
      include: {
        empreendimento: { select: { id: true, apelido: true } },
        cliente: { select: { id: true, apelido: true } },
      },
    });

    await logAuditoria("ATUALIZAR", "pgrs", pgrs.id, { numero: pgrs.numero, validade: pgrs.validade }, Number((session.user as { id: string }).id));
    return NextResponse.json(pgrs);
  } catch (error) {
    console.error("Erro ao atualizar PGRS:", error);
    return NextResponse.json({ error: "Erro ao atualizar PGRS" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const pgrs = await prisma.pgrs.findUnique({ where: { id: Number(id) } });
  if (!pgrs) return NextResponse.json({ error: "PGRS não encontrado" }, { status: 404 });

  await prisma.pgrs.delete({ where: { id: Number(id) } });

  await logAuditoria("EXCLUIR", "pgrs", Number(id), { numero: pgrs.numero }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "PGRS excluído" });
}
