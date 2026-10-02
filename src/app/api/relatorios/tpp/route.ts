import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";
import { buildXlsx, xlsxResponse } from "@/lib/report-xlsx";

function diasAte(dataValidade: Date): number {
  return Math.ceil((dataValidade.getTime() - Date.now()) / 86400000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");

  const tpps = await prisma.autorizacaoTpp.findMany({
    where: { ativo: true },
    include: {
      cliente: { select: { apelido: true } },
      empreendimento: { select: { apelido: true } },
    },
    orderBy: { dataValidade: "asc" },
  });

  const cols = [
    { header: "Nº Autorização", weight: 1.3 },
    { header: "Cliente", weight: 1.8 },
    { header: "Empreendimento", weight: 2.2 },
    { header: "Emissão", weight: 1.2, align: "center" as const },
    { header: "Validade", weight: 1.2, align: "center" as const },
    { header: "Dias", weight: 0.9, align: "center" as const },
    { header: "Situação", weight: 1.3, align: "center" as const },
  ];

  const rows: NagalliCell[][] = tpps.map((t) => {
    const dias = diasAte(t.dataValidade);
    const situacao = dias < 0 ? "Vencida" : dias <= 15 ? "A vencer" : "Vigente";
    return [
      { text: t.numero, bold: true },
      t.cliente.apelido || "—",
      t.empreendimento?.apelido || "—",
      { text: t.dataEmissao.toLocaleDateString("pt-BR"), align: "center" },
      { text: t.dataValidade.toLocaleDateString("pt-BR"), align: "center" },
      { text: String(dias), align: "center" },
      { text: situacao, align: "center", bold: dias <= 15 },
    ];
  });

  const vencidas = tpps.filter((t) => diasAte(t.dataValidade) < 0).length;
  const aVencer = tpps.filter((t) => {
    const d = diasAte(t.dataValidade);
    return d >= 0 && d <= 15;
  }).length;
  const vigentes = tpps.length - vencidas - aVencer;

  const summary = [
    { label: "Total de autorizações ativas", value: String(tpps.length) },
    ...(vencidas > 0 ? [{ label: "Vencidas", value: String(vencidas) }] : []),
    ...(aVencer > 0 ? [{ label: "A vencer em até 15 dias", value: String(aVencer) }] : []),
    ...(vigentes > 0 ? [{ label: "Vigentes", value: String(vigentes) }] : []),
  ];

  if (formato === "xlsx") {
    return xlsxResponse(
      buildXlsx({ title: "Relatório de TPP — Produtos Perigosos", subtitle: "Autorizações para transporte de produtos perigosos por cliente.", cols, rows, summary }),
      "relatorio-tpp"
    );
  }

  const { report } = await createNagalliReport({
    title: "Relatório de TPP — Produtos Perigosos",
    subtitle: "Autorizações para transporte de produtos perigosos: cliente, validade e situação.",
  });

  report.table(cols, rows, { cellSize: 8, headerSize: 9 });
  report.summary(summary);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-tpp.pdf"`,
    },
  });
}
