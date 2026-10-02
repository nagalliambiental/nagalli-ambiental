import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";
import { buildXlsx, xlsxResponse } from "@/lib/report-xlsx";

function diasAte(validade: Date): number {
  return Math.ceil((validade.getTime() - Date.now()) / 86400000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");

  const pgrs = await prisma.pgrs.findMany({
    where: { ativo: true },
    include: {
      cliente: { select: { apelido: true } },
      empreendimento: { select: { apelido: true } },
    },
    orderBy: { validade: "asc" },
  });

  const cols = [
    { header: "Nº Protocolo", weight: 1.4 },
    { header: "Cliente", weight: 1.8 },
    { header: "Empreendimento", weight: 2.2 },
    { header: "Órgão", weight: 1.3 },
    { header: "Deferido Em", weight: 1.2, align: "center" as const },
    { header: "Validade", weight: 1.2, align: "center" as const },
    { header: "Dias", weight: 0.9, align: "center" as const },
    { header: "Situação", weight: 1.3, align: "center" as const },
  ];

  const rows: NagalliCell[][] = pgrs.map((p) => {
    const dias = p.validade ? diasAte(p.validade) : null;
    const situacao = dias === null ? "Sem validade" : dias < 0 ? "Vencido" : dias <= p.alertaDias ? "Em alerta" : "Vigente";
    return [
      { text: p.numero || "—", bold: true },
      p.cliente?.apelido || "—",
      p.empreendimento.apelido || "—",
      p.orgao || "—",
      { text: p.deferidoEm ? p.deferidoEm.toLocaleDateString("pt-BR") : "—", align: "center" },
      { text: p.validade ? p.validade.toLocaleDateString("pt-BR") : "—", align: "center" },
      { text: dias === null ? "—" : String(dias), align: "center" },
      { text: situacao, align: "center", bold: dias !== null && dias <= p.alertaDias },
    ];
  });

  const semValidade = pgrs.filter((p) => !p.validade).length;
  const vencidos = pgrs.filter((p) => p.validade && diasAte(p.validade!) < 0).length;
  const emAlerta = pgrs.filter((p) => {
    if (!p.validade) return false;
    const d = diasAte(p.validade);
    return d >= 0 && d <= p.alertaDias;
  }).length;
  const vigentes = pgrs.length - semValidade - vencidos - emAlerta;

  const summary = [
    { label: "Total de PGRS ativos", value: String(pgrs.length) },
    ...(vencidos > 0 ? [{ label: "Vencidos", value: String(vencidos) }] : []),
    ...(emAlerta > 0 ? [{ label: "Em alerta", value: String(emAlerta) }] : []),
    ...(vigentes > 0 ? [{ label: "Vigentes", value: String(vigentes) }] : []),
    ...(semValidade > 0 ? [{ label: "Sem validade cadastrada", value: String(semValidade) }] : []),
  ];

  if (formato === "xlsx") {
    return xlsxResponse(
      buildXlsx({ title: "Relatório de PGRS", subtitle: "Planos de gerenciamento de resíduos sólidos: deferimento, validade e situação.", cols, rows, summary }),
      "relatorio-pgrs"
    );
  }

  const { report } = await createNagalliReport({
    title: "Relatório de PGRS",
    subtitle: "Planos de gerenciamento de resíduos sólidos: protocolo, deferimento, validade e situação.",
  });

  report.table(cols, rows, { cellSize: 8, headerSize: 9 });
  report.summary(summary);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-pgrs.pdf"`,
    },
  });
}
