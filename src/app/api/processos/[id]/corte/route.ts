import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const registro = await prisma.autorizacaoCorte.findUnique({
    where: { processoId: Number(id) },
  });

  return NextResponse.json(registro);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const processoId = Number(id);
  const usuarioId = Number((session.user as { id: string }).id);

  const processo = await prisma.processo.findUnique({ where: { id: processoId } });
  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  try {
    const form = await request.formData();

    const formaCompensacao = form.get("formaCompensacao") as string | null;
    const quantidadeIndividuos = form.get("quantidadeIndividuos");
    const compensacaoExigida = form.get("compensacaoExigida") === "true";
    const tipoCompensacao = form.get("tipoCompensacao");
    const quantidadeMudas = form.get("quantidadeMudas");
    const areaCompensacaoM2 = form.get("areaCompensacaoM2");
    const prazoCompensacao = form.get("prazoCompensacao");
    const statusCompensacao = form.get("statusCompensacao");
    const file = form.get("comprovante") as File | null;

    const existente = await prisma.autorizacaoCorte.findUnique({
      where: { processoId },
    });

    let comprovantePath = existente?.comprovante ?? null;
    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, safeName), buffer);
      comprovantePath = `/uploads/${safeName}`;
    }

    const data = {
      formaCompensacao: (formaCompensacao as string) || "individuos",
      quantidadeIndividuos: quantidadeIndividuos ? Number(quantidadeIndividuos) : null,
      compensacaoExigida,
      tipoCompensacao: (tipoCompensacao as string) || null,
      quantidadeMudas: quantidadeMudas ? Number(quantidadeMudas) : null,
      areaCompensacaoM2: areaCompensacaoM2 ? Number(areaCompensacaoM2) : null,
      prazoCompensacao: prazoCompensacao ? new Date(prazoCompensacao as string) : null,
      statusCompensacao: (statusCompensacao as string) || "pendente",
      comprovante: comprovantePath,
    };

    const registro = await prisma.autorizacaoCorte.upsert({
      where: { processoId },
      create: { processoId, ...data },
      update: data,
    });

    if (data.compensacaoExigida && data.prazoCompensacao && data.statusCompensacao !== "cumprida") {
      const forma = data.formaCompensacao === "area" ? "por área" : "por indivíduos";
      const descricao = `Cumprir compensação ambiental ${forma} (${data.tipoCompensacao || "reposição florestal"})`;
      if (registro.exigenciaId) {
        await prisma.exigencia.update({
          where: { id: registro.exigenciaId },
          data: { descricao, prazo: data.prazoCompensacao, cumprida: false },
        });
      } else {
        const exigencia = await prisma.exigencia.create({
          data: { descricao, prazo: data.prazoCompensacao, antecedenciaDias: 30, processoId },
        });
        await prisma.autorizacaoCorte.update({
          where: { processoId },
          data: { exigenciaId: exigencia.id },
        });
      }
    } else if (registro.exigenciaId && data.statusCompensacao === "cumprida") {
      await prisma.exigencia.update({
        where: { id: registro.exigenciaId },
        data: { cumprida: true },
      });
    }

    await logAuditoria("atualizar", "autorizacaoCorte", registro.id, data, usuarioId);

    return NextResponse.json(registro);
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar dados de compensação" },
      { status: 400 }
    );
  }
}
