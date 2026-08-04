import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModeloProposta } from "@/lib/propostas/modelos";
import { gerarDocxModelo } from "@/lib/propostas/geradores";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const proposta = await prisma.propostaServico.findUnique({ where: { id: Number(id) } });

  if (!proposta) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const modelo = getModeloProposta(proposta.modeloSlug);
  if (!modelo) return NextResponse.json({ error: "Modelo de proposta não encontrado" }, { status: 400 });

  const dados = (proposta.dados ?? {}) as Record<string, unknown>;

  const docxBuffer = gerarDocxModelo(proposta.modeloSlug, dados, {
    numero: proposta.numero,
    ano: proposta.ano,
    revisao: proposta.revisao,
  });

  const bytes = new Uint8Array(docxBuffer);

  const filename = `${modelo.prefixoArquivo}_${proposta.numero}_${proposta.ano}_REV${String(proposta.revisao).padStart(2, "0")}.docx`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}
