import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
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

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado",
  em_andamento: "Em Andamento",
  exigencia_recebida: "Exigência Recebida",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const processoId = Number(id);

  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    include: {
      orgao: { select: { sigla: true, nome: true } },
      empreendimento: { select: { apelido: true, cliente: { select: { apelido: true } } } },
      condicionantesItens: { orderBy: { ordem: "asc" } },
    },
  });

  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logos = await embedBrandLogos(pdf);

  const pageSize: [number, number] = [595, 842];
  let page = pdf.addPage(pageSize);
  drawBrandFooter(page, font, pageSize[0]);
  const { width, height } = page.getSize();
  const marginX = 40;
  const marginTop = 100;
  const colWidths = [width - 2 * marginX - 110, 110];
  const cellSize = 9;
  let y = height - marginTop;

  function wrapCell(text: string, w: number): string[] {
    return wrapLines(text, font, cellSize, w - 10);
  }

  function drawPageHeader(withMeta: boolean) {
    drawBrandHeader(page, logos, marginX, height - 20);
    page.drawText("Relatório de Atendimento a Condicionantes", { x: marginX, y, size: 16, font: bold });
    y -= 22;

    if (withMeta) {
      const meta = [
        `Protocolo: ${processo!.numProtocolo}`,
        processo!.numLicenca ? `Licença: ${processo!.numLicenca}` : null,
        `Tipo: ${processo!.tipo}`,
        `Órgão: ${processo!.orgao.sigla}`,
        `Empreendimento: ${processo!.empreendimento.apelido}`,
        `Cliente: ${processo!.empreendimento.cliente.apelido}`,
        `Status: ${statusLabels[processo!.status] || processo!.status}`,
      ].filter(Boolean) as string[];

      for (const line of meta) {
        page.drawText(line, { x: marginX, y, size: 9, font });
        y -= 12;
      }
      page.drawText(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { x: marginX, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 18;
    } else {
      y -= 6;
    }

    page.drawRectangle({ x: marginX, y: y - 14, width: width - 2 * marginX, height: 16, color: rgb(0.2, 0.2, 0.2) });
    page.drawText("Condicionante", { x: marginX + 6, y: y - 10, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Atendida", { x: marginX + colWidths[0] + 6, y: y - 10, size: 9, font: bold, color: rgb(1, 1, 1) });
    y -= 20;
  }

  drawPageHeader(true);

  function drawCheckbox(targetPage: PDFPage, x: number, topY: number, atendida: boolean) {
    const boxSize = 10;
    const boxY = topY - boxSize;
    targetPage.drawRectangle({
      x,
      y: boxY,
      width: boxSize,
      height: boxSize,
      borderColor: rgb(0.3, 0.3, 0.3),
      borderWidth: 1,
      color: atendida ? rgb(0.24, 0.45, 0.28) : rgb(1, 1, 1),
    });
    if (atendida) {
      targetPage.drawLine({ start: { x: x + 2, y: boxY + 5 }, end: { x: x + 4.2, y: boxY + 2.5 }, thickness: 1.3, color: rgb(1, 1, 1) });
      targetPage.drawLine({ start: { x: x + 4.2, y: boxY + 2.5 }, end: { x: x + 8, y: boxY + 8 }, thickness: 1.3, color: rgb(1, 1, 1) });
    }
    targetPage.drawText(atendida ? "Sim" : "Não", {
      x: x + boxSize + 6,
      y: boxY + 2,
      size: 8,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  if (processo.condicionantesItens.length === 0) {
    page.drawText("Nenhuma condicionante registrada para este processo.", { x: marginX, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  }

  let row = 0;
  for (const item of processo.condicionantesItens) {
    const wrapped = wrapCell(item.texto, colWidths[0]);
    const rowHeight = Math.max(wrapped.length * (cellSize + 3), 20) + 6;

    if (y - rowHeight < 60) {
      page = pdf.addPage(pageSize);
      drawBrandFooter(page, font, width);
      y = height - marginTop;
      drawPageHeader(false);
    }

    if (row % 2 === 0) {
      page.drawRectangle({ x: marginX, y: y - rowHeight + 6, width: width - 2 * marginX, height: rowHeight, color: rgb(0.96, 0.96, 0.96) });
    }

    let ly = y;
    for (const line of wrapped) {
      page.drawText(line, { x: marginX + 6, y: ly, size: cellSize, font, color: rgb(0.15, 0.15, 0.15) });
      ly -= cellSize + 3;
    }

    drawCheckbox(page, marginX + colWidths[0] + 6, y + 5, item.atendida);

    y -= rowHeight;
    row++;
  }

  const pdfBytes = await pdf.save();
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-condicionantes-${processo.numProtocolo}.pdf"`,
    },
  });
}
