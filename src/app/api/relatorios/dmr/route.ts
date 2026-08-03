import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

function wrapLines(text: string, f: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && f.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

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
  const marginX = 40;
  const marginTop = 60;
  const colWidths = [90, 100, 72, 72, 72, 72, 72, 72, 72, 72];
  const cellSize = 8;
  let y = height - marginTop;

  function wrapCell(text: string, w: number): string[] {
    return wrapLines(text, font, cellSize, w - 6);
  }

  function drawCell(text: string, x: number, lines: string[]) {
    let ly = y;
    for (const ln of lines) {
      page.drawText(ln, { x, y: ly, size: cellSize, font, color: rgb(0.15, 0.15, 0.15) });
      ly -= cellSize + 2;
    }
    void text;
  }

  const headers = ["Cliente", "Empreendimento", "T1 DMR", "T1 MTR", "T2 DMR", "T2 MTR", "T3 DMR", "T3 MTR", "T4 DMR", "T4 MTR"];

  function drawPageHeader() {
    page.drawText("Relatório DMR", { x: marginX, y, size: 18, font: bold });
    y -= 20;
    page.drawText(`Ano: ${ano}`, { x: marginX, y, size: 11, font });
    y -= 16;
    page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: marginX, y, size: 9, font });
    y -= 24;

    page.drawRectangle({ x: marginX, y: y - 12, width: width - 80, height: 14, color: rgb(0.2, 0.2, 0.2) });

    let x = marginX + 4;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x, y, size: 8, font: bold, color: rgb(1, 1, 1) });
      x += colWidths[i];
    }
    y -= 14;
  }

  drawPageHeader();

  let row = 0;
  for (const r of registros) {
    const cells: string[] = [
      r.empreendimento.cliente.apelido || "",
      r.empreendimento.apelido || "",
    ];
    for (const tri of [1, 2, 3, 4]) {
      const dmr = r[`t${tri}Dmr` as keyof typeof r] as string || "";
      const mtr = r[`t${tri}Mtr` as keyof typeof r] as string || "";
      cells.push(dmr === "OK" ? "OK" : dmr ? dmr : "—");
      cells.push(mtr === "OK" ? "OK" : mtr ? mtr : "—");
    }
    const wrapped = cells.map((text, i) => wrapCell(text, colWidths[i]));
    const linesCount = Math.max(...wrapped.map((l) => l.length));
    const rowHeight = linesCount * (cellSize + 2) + 4;

    if (y - rowHeight < 50) {
      page = pdf.addPage([842, 595]);
      y = height - marginTop;
      drawPageHeader();
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: marginX, y: y - rowHeight + 4, width: width - 80, height: rowHeight, color: rgb(0.95, 0.95, 0.95) });
    }

    let x = marginX + 4;
    for (let i = 0; i < cells.length; i++) {
      drawCell(cells[i], x, wrapped[i]);
      x += colWidths[i];
    }

    y -= rowHeight;
    row++;
  }

  y -= 20;
  if (y < 50) {
    page = pdf.addPage([842, 595]);
    y = height - marginTop;
  }
  page.drawText(`Total de empreendimentos: ${registros.length}`, { x: marginX, y, size: 10, font: bold });

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-dmr-${ano}.pdf"`,
    },
  });
}
