import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

  let page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const marginX = 40;
  const marginTop = 60;
  const colWidths = [80, 120, 60, 100, 80, 80, 80];
  let y = height - marginTop;

  function drawCell(text: string, x: number, w: number) {
    page.drawText(text.slice(0, Math.floor(w / 4.8)), { x, y, size: 8, font, color: rgb(0.15, 0.15, 0.15) });
  }

  const headers = ["Protocolo", "Cliente", "Tipo", "Empreendimento", "Órgão", "Status", "Validade"];

  function drawPageHeader() {
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
  }

  drawPageHeader();

  let row = 0;
  for (const p of processos) {
    if (y < 50) {
      page = pdf.addPage([842, 595]);
      y = height - marginTop;
      drawPageHeader();
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: marginX, y: y - 12, width: width - 80, height: 14, color: rgb(0.95, 0.95, 0.95) });
    }

    let x = marginX + 4;
    drawCell(p.numProtocolo, x, colWidths[0]); x += colWidths[0];
    drawCell(p.empreendimento.cliente.apelido, x, colWidths[1]); x += colWidths[1];
    drawCell(p.tipo, x, colWidths[2]); x += colWidths[2];
    drawCell(p.empreendimento.apelido, x, colWidths[3]); x += colWidths[3];
    drawCell(p.orgao.sigla, x, colWidths[4]); x += colWidths[4];
    drawCell(statusLabels[p.status] || p.status, x, colWidths[5]); x += colWidths[5];
    drawCell(p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "—", x, colWidths[6]);

    y -= 14;
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
