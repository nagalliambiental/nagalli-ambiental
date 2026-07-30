import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    include: { _count: { select: { empreendimentos: true } } },
    orderBy: { apelido: "asc" },
  });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const margin = 40;
  const colWidths = [100, 160, 120, 100, 80];
  let y = height - margin;

  function drawHeader(text: string, x: number) {
    page.drawText(text, { x, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  }

  function drawCell(text: string, x: number, w: number, boldCell = false) {
    page.drawText(text.slice(0, Math.floor(w / 4.8)), { x, y, size: 8, font: boldCell ? bold : font, color: rgb(0.15, 0.15, 0.15) });
  }

  page.drawText("Relatório de Clientes", { x: margin, y, size: 18, font: bold });
  y -= 20;
  page.drawText(`Total de clientes: ${clientes.length}`, { x: margin, y, size: 11, font }); y -= 14;
  page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: margin, y, size: 9, font });
  y -= 24;

  page.drawRectangle({ x: margin, y: y - 12, width: width - 80, height: 14, color: rgb(0.2, 0.2, 0.2) });

  const headers = ["Apelido", "Razão Social", "CNPJ", "Telefone", "Empreendimentos"];
  let x = margin + 4;
  for (let i = 0; i < headers.length; i++) {
    drawHeader(headers[i], x);
    x += colWidths[i];
  }
  y -= 14;

  let row = 0;
  for (const c of clientes) {
    if (y < 50) {
      page = pdf.addPage([842, 595]);
      y = height - margin;
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: margin, y: y - 12, width: width - 80, height: 14, color: rgb(0.95, 0.95, 0.95) });
    }

    x = margin + 4;
    drawCell(c.apelido, x, colWidths[0], true); x += colWidths[0];
    drawCell(c.razaoSocial, x, colWidths[1]); x += colWidths[1];
    drawCell(c.cnpj, x, colWidths[2]); x += colWidths[2];
    drawCell(c.telefone, x, colWidths[3]); x += colWidths[3];
    drawCell(String(c._count.empreendimentos), x, colWidths[4]);

    y -= 14;
    row++;
  }

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-clientes.pdf"`,
    },
  });
}
