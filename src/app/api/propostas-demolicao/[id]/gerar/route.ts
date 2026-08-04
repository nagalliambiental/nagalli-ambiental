import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarPropostaDemolicao } from "@/lib/templates/proposta-demolicao/generate";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const proposta = await prisma.propostaDemolicao.findUnique({ where: { id: Number(id) } });

  if (!proposta) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const formData = {
    engenheiroNome: proposta.engenheiroNome,
    empresaNome: proposta.empresaNome,
    bairro: proposta.bairro,
    cidade: proposta.cidade,
    uf: proposta.uf,
    quantidadePgrcc: proposta.quantidadePgrcc,
    quantidadeRgrcc: proposta.quantidadeRgrcc,
    valorUnitPgrcc: proposta.valorUnitPgrcc,
    valorUnitRgrcc: proposta.valorUnitRgrcc,
    percentualDesconto: proposta.percentualDesconto ?? 18,
    valorDesconto: proposta.valorDesconto ?? undefined,
    totalFinal: proposta.totalFinal ?? undefined,
    observacoes: proposta.observacoes ?? undefined,
  };

  const docxBuffer = gerarPropostaDemolicao(formData, {
    numero: proposta.numero,
    ano: proposta.ano,
    revisao: proposta.revisao,
  });

  const bytes = new Uint8Array(docxBuffer);

  const filename = `Proposta_Demolicao_${proposta.numero}_${proposta.ano}_REV${String(proposta.revisao).padStart(2, "0")}.docx`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}