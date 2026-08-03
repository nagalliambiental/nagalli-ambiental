import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { embedBrandLogos, drawBrandHeader, drawBrandFooter } from "@/lib/pdf-branding";

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

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    include: { _count: { select: { empreendimentos: true } } },
    orderBy: { apelido: "asc" },
  });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logos = await embedBrandLogos(pdf);

  let page = pdf.addPage([842, 595]);
  drawBrandFooter(page, font, 842);
  const { width, height } = page.getSize();
  const marginX = 40;
  const marginTop = 92;
  const colWidths = [100, 160, 120, 100, 80];
  const cellSize = 8;
  let y = height - marginTop;

  function wrapCell(text: string, w: number): string[] {
    return wrapLines(text, font, cellSize, w - 6);
  }

  function drawCell(text: string, x: number, w: number, lines: string[], boldCell = false) {
    let ly = y;
    for (const ln of lines) {
      page.drawText(ln, { x, y: ly, size: cellSize, font: boldCell ? bold : font, color: rgb(0.15, 0.15, 0.15) });
      ly -= cellSize + 2;
    }
    void w;
  }

  const headers = ["Apelido", "Razão Social", "CNPJ", "Telefone", "Empreendimentos"];

  function drawPageHeader() {
    drawBrandHeader(page, logos, marginX, height - 20);
    page.drawText("Relatório de Clientes", { x: marginX, y, size: 18, font: bold });
    y -= 20;
    page.drawText(`Total de clientes: ${clientes.length}`, { x: marginX, y, size: 11, font }); y -= 14;
    page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: marginX, y, size: 9, font });
    y -= 24;

    page.drawRectangle({ x: marginX, y: y - 14, width: width - 80, height: 16, color: rgb(0.2, 0.2, 0.2) });

    let x = marginX + 4;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x, y: y - 10, size: 9, font: bold, color: rgb(1, 1, 1) });
      x += colWidths[i];
    }
    y -= 24;
  }

  drawPageHeader();

  let row = 0;
  for (const c of clientes) {
    const cells: { text: string; w: number; boldCell: boolean }[] = [
      { text: c.apelido || "", w: colWidths[0], boldCell: true },
      { text: c.razaoSocial || "", w: colWidths[1], boldCell: false },
      { text: c.cnpj || "", w: colWidths[2], boldCell: false },
      { text: c.telefone || "", w: colWidths[3], boldCell: false },
      { text: String(c._count.empreendimentos), w: colWidths[4], boldCell: false },
    ];
    const wrapped = cells.map((c) => wrapCell(c.text, c.w));
    const linesCount = Math.max(...wrapped.map((l) => l.length));
    const rowHeight = linesCount * (cellSize + 2) + 4;

    if (y - rowHeight < 50) {
      page = pdf.addPage([842, 595]);
      drawBrandFooter(page, font, width);
      y = height - marginTop;
      drawPageHeader();
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: marginX, y: y - rowHeight + 4, width: width - 80, height: rowHeight, color: rgb(0.95, 0.95, 0.95) });
    }

    let x = marginX + 4;
    for (let i = 0; i < cells.length; i++) {
      drawCell(cells[i].text, x, cells[i].w, wrapped[i], cells[i].boldCell);
      x += cells[i].w;
    }

    y -= rowHeight;
    row++;
  }

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-clientes.pdf"`,
    },
  });
}
