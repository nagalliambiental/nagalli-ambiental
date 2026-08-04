import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { embedNagalliLogo, drawNagalliTopo, drawNagalliFooter } from "@/lib/report-branding";

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
  const status = searchParams.get("status");

  const where: Prisma.ProcessoWhereInput = {};
  if (status) where.status = status;

  const processos = await prisma.processo.findMany({
    where,
    include: {
      orgao: { select: { sigla: true } },
      empreendimento: { select: { apelido: true, cliente: { select: { apelido: true } } } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const statusLabels: Record<string, string> = {
    protocolado: "Protocolado", em_andamento: "Em Andamento", exigencia_recebida: "Exigência Recebida",
    deferido: "Deferido", indeferido: "Indeferido", arquivado: "Arquivado",
  };

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedNagalliLogo(pdf);

  let page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const marginX = 40;
  const marginTop = 60;
  const colWidths = [80, 120, 60, 100, 80, 80, 80];
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

  const headers = ["Protocolo", "Cliente", "Tipo", "Empreendimento", "Órgão", "Status", "Validade"];

  function drawPageHeader() {
    y = drawNagalliTopo(page, logo, font, bold);
    page.drawText("Relatório de Processos", { x: marginX, y, size: 18, font: bold });
    y -= 20;
    page.drawText(`Total: ${processos.length}`, { x: marginX, y, size: 11, font }); y -= 14;
    page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: marginX, y, size: 9, font });
    y -= 24;

    page.drawRectangle({ x: marginX, y: y - 12, width: width - 80, height: 14, color: rgb(0.2, 0.2, 0.2) });

    let x = marginX + 4;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x, y, size: 9, font: bold, color: rgb(1, 1, 1) });
      x += colWidths[i];
    }
    y -= 14;
    drawNagalliFooter(page, font, bold);
  }

  drawPageHeader();

  let row = 0;
  for (const p of processos) {
    const cells: string[] = [
      p.numProtocolo || "",
      p.empreendimento.cliente.apelido || "",
      p.tipo || "",
      p.empreendimento.apelido || "",
      p.orgao.sigla || "",
      statusLabels[p.status] || p.status,
      p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "—",
    ];
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

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-processos.pdf"`,
    },
  });
}
