import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { dataInputParaDate } from "@/lib/format";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const empreendimentoId = searchParams.get("empreendimentoId");
  const clienteId = searchParams.get("clienteId");

  const pgrs = await prisma.pgrs.findMany({
    where: {
      ativo: true,
      ...(empreendimentoId ? { empreendimentoId: Number(empreendimentoId) } : {}),
      ...(clienteId ? { clienteId: Number(clienteId) } : {}),
    },
    include: {
      empreendimento: {
        select: { id: true, apelido: true, cliente: { select: { id: true, apelido: true } } },
      },
      cliente: { select: { id: true, apelido: true } },
    },
    orderBy: [{ validade: "asc" }, { criadoEm: "desc" }],
  });

  return NextResponse.json(pgrs);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const empreendimentoId = Number(formData.get("empreendimentoId"));
    if (!empreendimentoId) {
      return NextResponse.json({ error: "Informe o empreendimento" }, { status: 400 });
    }

    const empreendimento = await prisma.empreendimento.findUnique({
      where: { id: empreendimentoId },
      select: { clienteId: true },
    });
    if (!empreendimento) {
      return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
    }

    const validadeStr = (formData.get("validade") as string) || "";
    const validade = dataInputParaDate(validadeStr);
    const validadeOrigem = validade ? ((formData.get("validadeOrigem") as string) || "manual") : null;

    let arquivoNome: string | null = null;
    let arquivoCaminho: string | null = null;
    let arquivoConteudo: Uint8Array<ArrayBuffer> | null = null;
    const file = formData.get("arquivo") as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `pgrs-${Date.now()}-${file.name}`;
      arquivoNome = file.name;
      arquivoCaminho = `/uploads/${safeName}`;
      arquivoConteudo = new Uint8Array(buffer);
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, safeName), buffer);
      } catch {
        // ambiente sem escrita em disco (ex.: Vercel) - o conteúdo fica no banco
      }
    }

    const pgrs = await prisma.pgrs.create({
      data: {
        empreendimentoId,
        clienteId: empreendimento.clienteId,
        numero: ((formData.get("numero") as string) || "").trim() || null,
        orgao: ((formData.get("orgao") as string) || "").trim() || null,
        deferidoEm: dataInputParaDate((formData.get("deferidoEm") as string) || ""),
        validade,
        validadeOrigem,
        alertaDias: Number(formData.get("alertaDias")) || 180,
        observacoes: ((formData.get("observacoes") as string) || "").trim() || null,
        arquivoNome,
        arquivoCaminho,
        arquivoConteudo,
      },
      include: {
        empreendimento: { select: { id: true, apelido: true } },
        cliente: { select: { id: true, apelido: true } },
      },
    });

    await logAuditoria(
      "criar",
      "pgrs",
      pgrs.id,
      { numero: pgrs.numero, validade: pgrs.validade, empreendimentoId },
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(pgrs, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar PGRS:", error);
    return NextResponse.json({ error: "Erro ao criar PGRS" }, { status: 400 });
  }
}
