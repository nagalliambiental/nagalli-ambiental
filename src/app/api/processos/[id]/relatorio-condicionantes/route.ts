import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import {
  buildCondicionantesData,
  renderCondicionantesDocx,
} from "@/lib/templates/relatorio-condicionantes/generate";
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
  const processo = await prisma.processo.findUnique({
    where: { id: Number(id) },
    include: { empreendimento: { include: { cliente: true } } },
  });

  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  const hoje = new Date();
  const dataEmissao = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const cidadeUf = [processo.empreendimento.municipio, processo.empreendimento.uf]
    .filter(Boolean)
    .join(", ");
  const localidade = cidadeUf || "Localidade";

  const data = buildCondicionantesData(
    processo,
    { razaoSocial: processo.empreendimento.cliente.razaoSocial },
    `${localidade}, ${dataEmissao}`
  );

  let buffer: Buffer;
  try {
    buffer = renderCondicionantesDocx(data);
  } catch (err) {
    console.error("Erro ao renderizar relatório de condicionantes:", err);
    return NextResponse.json({ error: "Erro ao gerar o relatório" }, { status: 500 });
  }

  const safeName = `Relatorio_de_Condicionantes_${processo.empreendimento.apelido}.docx`.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  const caminho = `/uploads/documentos/${safeName}`;
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documentos");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);
  } catch (saveErr) {
    console.error("Erro ao salvar arquivo em disco:", saveErr);
  }

  try {
    const docExistente = await prisma.documento.findFirst({
      where: {
        processoId: processo.id,
        nome: { contains: "Relatório de condicionantes" },
      },
    });

    if (!docExistente) {
      const documento = await prisma.documento.create({
        data: {
          nome: "Relatório de condicionantes",
          tipo: "relatorio",
          caminho,
          tamanho: buffer.length,
          processoId: processo.id,
        },
      });

      await logAuditoria(
        "criar",
        "documento",
        documento.id,
        { nome: "Relatório de condicionantes", caminho },
        Number((session.user as { id: string }).id)
      );
    }
  } catch (dbErr) {
    console.error("Erro ao salvar registro do documento no banco:", dbErr);
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}
