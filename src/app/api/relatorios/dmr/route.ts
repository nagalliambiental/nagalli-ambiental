import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNagalliReport, type NagalliCell } from "@/lib/report-layout";
import { buildXlsx, xlsxResponse } from "@/lib/report-xlsx";

function statusCell(raw: string | undefined): NagalliCell {
  const val = (raw || "").trim();
  if (!val) return { text: "—", align: "center" };
  if (val.toUpperCase() === "OK") return { text: "OK", align: "center", bold: true, color: "#446B2C" };
  if (val.toUpperCase() === "PENDENTE") return { text: "Pendente", align: "center", bold: true, color: "#B45309" };
  return { text: val, align: "center" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ano = Number(searchParams.get("ano")) || new Date().getFullYear();
  const formato = searchParams.get("formato");

  const registros = await prisma.controleDmr.findMany({
    where: { ano },
    include: {
      empreendimento: {
        select: { apelido: true, cliente: { select: { apelido: true } } },
      },
    },
    orderBy: { empreendimento: { cliente: { apelido: "asc" } } },
  });

  const cols = [
    { header: "Cliente", weight: 1.7 },
    { header: "Empreendimento", weight: 2.2 },
    ...["T1 DMR", "T1 MTR", "T2 DMR", "T2 MTR", "T3 DMR", "T3 MTR", "T4 DMR", "T4 MTR"].map((h) => ({
      header: h,
      weight: 1,
      align: "center" as const,
    })),
  ];

  const rows: NagalliCell[][] = registros.map((r) => {
    const cells: NagalliCell[] = [
      r.empreendimento.cliente.apelido || "—",
      { text: r.empreendimento.apelido || "—", bold: true },
    ];
    for (const tri of [1, 2, 3, 4]) {
      cells.push(statusCell(r[`t${tri}Dmr` as keyof typeof r] as string | undefined));
      cells.push(statusCell(r[`t${tri}Mtr` as keyof typeof r] as string | undefined));
    }
    return cells;
  });

  const totalOk = registros.filter((r) => {
    for (const tri of [1, 2, 3, 4]) {
      const dmr = (r[`t${tri}Dmr` as keyof typeof r] as string) || "";
      const mtr = (r[`t${tri}Mtr` as keyof typeof r] as string) || "";
      if (dmr.toUpperCase() === "PENDENTE" || mtr.toUpperCase() === "PENDENTE") return true;
      if (!dmr || !mtr) return true;
    }
    return false;
  }).length;

  const summary = [
    { label: "Empreendimentos no relatório", value: String(registros.length) },
    { label: "Com pendências DMR/MTR", value: String(totalOk) },
  ];

  if (formato === "xlsx") {
    return xlsxResponse(
      buildXlsx({
        title: "Relatório de Controle DMR/MTR",
        subtitle: `Situação das declarações DMR e MTR de cada empreendimento por trimestre de ${ano}.`,
        cols,
        rows,
        summary,
        sheetName: `DMR/MTR ${ano}`,
      }),
      `relatorio-dmr-${ano}`
    );
  }

  const { report } = await createNagalliReport({
    title: "Relatório de Controle DMR/MTR",
    subtitle: `Situação das declarações DMR e MTR de cada empreendimento por trimestre de ${ano}.`,
  });

  report.table(cols, rows, { cellSize: 8, headerSize: 8 });
  report.summary(summary);

  const pdfBytes = await report.bytes();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-dmr-${ano}.pdf"`,
    },
  });
}
