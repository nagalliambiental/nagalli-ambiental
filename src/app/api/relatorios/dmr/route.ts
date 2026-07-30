import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ano = Number(searchParams.get("ano")) || new Date().getFullYear();

  const registros = await prisma.controleDmr.findMany({
    where: { ano },
    include: {
      empreendimento: {
        select: { apelido: true, cliente: { select: { apelido: true } } },
      },
    },
    orderBy: { empreendimento: { cliente: { apelido: "asc" } } },
  });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const margin = 40;
  const colWidths = [90, 100, 72, 72, 72, 72, 72, 72, 72, 72];
  let y = height - margin;

  function drawHeader(text: string, x: number, w: number) {
    page.drawText(text, { x, y, size: 8, font: bold, color: rgb(1, 1, 1) });
  }

  function drawCell(text: string, x: number, w: number) {
    page.drawText(text.slice(0, Math.floor(w / 4.5)), { x, y, size: 8, font, color: rgb(0.15, 0.15, 0.15) });
  }

  page.drawText("Relatório DMR", { x: margin, y, size: 18, font: bold });
  y -= 20;
  page.drawText(`Ano: ${ano}`, { x: margin, y, size: 11, font });
  y -= 16;
  page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: margin, y, size: 9, font });
  y -= 24;

  page.drawRectangle({ x: margin, y: y - 12, width: width - 80, height: 14, color: rgb(0.2, 0.2, 0.2) });

  const headers = ["Cliente", "Empreendimento", "T1 DMR", "T1 MTR", "T2 DMR", "T2 MTR", "T3 DMR", "T3 MTR", "T4 DMR", "T4 MTR"];
  let x = margin + 4;
  for (let i = 0; i < headers.length; i++) {
    drawHeader(headers[i], x, colWidths[i]);
    x += colWidths[i];
  }
  y -= 14;

  let row = 0;
  for (const r of registros) {
    if (y < 50) {
      page = pdf.addPage([842, 595]);
      y = height - margin;
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: margin, y: y - 12, width: width - 80, height: 14, color: rgb(0.95, 0.95, 0.95) });
    }

    x = margin + 4;
    drawCell(r.empreendimento.cliente.apelido, x, colWidths[0]);
    x += colWidths[0];
    drawCell(r.empreendimento.apelido, x, colWidths[1]);
    x += colWidths[1];

    for (const tri of [1, 2, 3, 4]) {
      const dmr = (r as Record<string, string>)[`t${tri}Dmr`] || "";
      const mtr = (r as Record<string, string>)[`t${tri}Mtr`] || "";
      drawCell(dmr === "OK" ? "OK" : dmr ? dmr : "—", x, colWidths[2]);
      x += colWidths[2];
      drawCell(mtr === "OK" ? "OK" : mtr ? mtr : "—", x, colWidths[2]);
      x += colWidths[2];
    }

    y -= 14;
    row++;
  }

  y -= 20;
  page.drawText(`Total de empreendimentos: ${registros.length}`, { x: margin, y, size: 10, font: bold });

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-dmr-${ano}.pdf"`,
    },
  });
}
