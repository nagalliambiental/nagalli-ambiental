import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  buildCondicionantesData,
  renderCondicionantesDocx,
} from "@/lib/templates/relatorio-condicionantes/generate";

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

  const dataEmissao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const data = buildCondicionantesData(
    processo,
    { razaoSocial: processo.empreendimento.cliente.razaoSocial },
    `Brasília, ${dataEmissao}`
  );

  let buffer: Buffer;
  try {
    buffer = renderCondicionantesDocx(data);
  } catch (err) {
    console.error("Erro ao renderizar relatório de condicionantes:", err);
    return NextResponse.json({ error: "Erro ao gerar o relatório" }, { status: 500 });
  }

  const filename = `relatorio_condicionantes_${processo.numLicenca || processo.numProtocolo || processo.id}.docx`
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
