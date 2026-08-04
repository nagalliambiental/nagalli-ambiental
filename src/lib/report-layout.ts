import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import {
  embedNagalliLogo,
  drawNagalliTopo,
  drawNagalliFooter,
  PALETTE,
} from "./report-branding";

export type Align = "left" | "center" | "right";

export interface NagalliCol {
  header: string;
  weight?: number;
  align?: Align;
  headerAlign?: Align;
}

export type NagalliCell = string | { text: string; bold?: boolean; color?: string; align?: Align };

export interface NagalliTableOptions {
  cellSize?: number;
  headerSize?: number;
  zebra?: boolean;
  grid?: boolean;
}

export interface NagalliSummaryItem {
  label: string;
  value: string;
  valueBold?: boolean;
}

const PAGE_SIZE: [number, number] = [842, 595];
const MARGIN_X = 40;
const TOP_MARGIN = 86;
const BOTTOM_RESERVE = 62;
const CELL_PAD_X = 5;
const LINE_H = 3.4;

export function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0.24, 0.27, 0.21);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255);
}

function toPair(cell: NagalliCell): { text: string; bold: boolean; align: Align; color?: ReturnType<typeof rgb> } {
  if (typeof cell === "string") return { text: cell, bold: false, align: "left" };
  return {
    text: cell.text,
    bold: !!cell.bold,
    align: cell.align || "left",
    color: cell.color ? hexToRgb(cell.color) : undefined,
  };
}

export function wrapLines(text: string, f: PDFFont, size: number, maxWidth: number): string[] {
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

export class NagalliReport {
  readonly pdf: PDFDocument;
  readonly font: PDFFont;
  readonly bold: PDFFont;
  readonly logo: PDFImage | null;
  readonly usableW: number;
  readonly pageW: number;
  readonly pageH: number;

  private pages: PDFPage[] = [];
  page: PDFPage;
  y: number = 0;

  private title: string;
  private subtitle: string;
  private footerNote: string;

  constructor(
    pdf: PDFDocument,
    font: PDFFont,
    bold: PDFFont,
    logo: PDFImage | null,
    opts: { title: string; subtitle?: string; footerNote?: string }
  ) {
    this.pdf = pdf;
    this.font = font;
    this.bold = bold;
    this.logo = logo;
    this.title = opts.title;
    this.subtitle = opts.subtitle || "";
    this.footerNote = opts.footerNote || "";
    this.pageW = PAGE_SIZE[0];
    this.pageH = PAGE_SIZE[1];
    this.usableW = PAGE_SIZE[0] - MARGIN_X * 2;
    this.page = this.addPage();
  }

  private addPage(): PDFPage {
    const page = this.pdf.addPage(PAGE_SIZE);
    this.pages.push(page);
    this.page = page;
    this.y = this.pageH - TOP_MARGIN;
    this.drawPageChrome();
    return page;
  }

  private drawPageChrome() {
    this.y = drawNagalliTopo(this.page, this.logo, this.font, this.bold) - 8;

    this.page.drawText(this.title, {
      x: MARGIN_X,
      y: this.y,
      size: 15,
      font: this.bold,
      color: PALETTE.ink["900"],
    });

    const generated = `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    this.page.drawText(generated, {
      x: this.pageW - MARGIN_X,
      y: this.y + 2,
      size: 7.5,
      font: this.font,
      color: PALETTE.ink["500"],
    });

    if (this.subtitle) {
      this.y -= 14;
      this.page.drawText(this.subtitle, {
        x: MARGIN_X,
        y: this.y,
        size: 9.5,
        font: this.font,
        color: PALETTE.ink["500"],
      });
    }

    this.y -= 16;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: this.pageW - MARGIN_X, y: this.y },
      thickness: 1.5,
      color: PALETTE.brand["500"],
    });
    this.y -= 12;

    drawNagalliFooter(this.page, this.font, this.bold);
    if (this.footerNote) {
      this.page.drawText(this.footerNote, {
        x: this.pageW - MARGIN_X,
        y: 30,
        size: 7,
        font: this.font,
        color: PALETTE.ink["300"],
      });
    }
  }

  needsPageBreak(rows: number, rowHeight: number): boolean {
    return this.y - rowHeight < BOTTOM_RESERVE + rows * 2;
  }

  sectionTitle(text: string, size = 11) {
    if (this.y < BOTTOM_RESERVE + 20) this.addPage();
    this.y -= 4;
    this.page.drawText(text, { x: MARGIN_X, y: this.y, size, font: this.bold, color: PALETTE.brand["700"] });
    this.y -= size + 6;
  }

  spacer(h = 10) {
    this.y -= h;
  }

  table(
    cols: NagalliCol[],
    rows: NagalliCell[][],
    options: NagalliTableOptions = {}
  ): { rowHeights: number[]; endY: number } {
    const cellSize = options.cellSize ?? 8;
    const headerSize = options.headerSize ?? 9;
    const zebra = options.zebra ?? true;
    const grid = options.grid ?? true;

    const totalWeight = cols.reduce((s, c) => s + (c.weight ?? 1), 0) || 1;
    const widths = cols.map((c) => (this.usableW * (c.weight ?? 1)) / totalWeight);
    const lefts: number[] = [];
    let acc = MARGIN_X;
    for (const w of widths) {
      lefts.push(acc);
      acc += w;
    }

    const drawHeaderRow = () => {
      const headSize = this.fitHeaderSize(cols, widths, headerSize);
      this.page.drawRectangle({ x: MARGIN_X, y: this.y - 13, width: this.usableW, height: 16, color: PALETTE.brand["600"] });
      cols.forEach((c, i) => {
        const align = c.headerAlign || c.align || "left";
        const textW = this.bold.widthOfTextAtSize(c.header, headSize);
        const tx = this.alignX(align, widths[i], lefts[i] + CELL_PAD_X, widths[i] - CELL_PAD_X * 2, textW);
        this.page.drawText(c.header, {
          x: tx,
          y: this.y - 9.5,
          size: headSize,
          font: this.bold,
          color: rgb(1, 1, 1),
        });
      });
      this.y -= 16;
    };

    drawHeaderRow();

    const rowHeights: number[] = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const pairs = row.map(toPair);
      const wrapped = pairs.map((p, i) =>
        wrapLines(p.text, this.font, cellSize, widths[i] - CELL_PAD_X * 2)
      );
      const linesCount = Math.max(...wrapped.map((l) => l.length));
      const rowHeight = linesCount * (cellSize + LINE_H) + 5;

      if (this.needsPageBreak(r, rowHeight)) {
        this.addPage();
        drawHeaderRow();
      }

      if (zebra && r % 2 === 0) {
        this.page.drawRectangle({
          x: MARGIN_X,
          y: this.y - rowHeight + 4,
          width: this.usableW,
          height: rowHeight,
          color: PALETTE.paper["50"],
        });
      }

      pairs.forEach((p, i) => {
        const lines = wrapped[i];
        let ly = this.y - cellSize + 1;
        for (const ln of lines) {
          const tx = this.alignX(
            p.align,
            widths[i],
            lefts[i] + CELL_PAD_X,
            widths[i] - CELL_PAD_X * 2,
            this.font.widthOfTextAtSize(ln, cellSize)
          );
          this.page.drawText(ln, {
            x: tx,
            y: ly,
            size: cellSize,
            font: p.bold ? this.bold : this.font,
            color: p.color || (p.bold ? PALETTE.ink["900"] : PALETTE.ink["700"]),
          });
          ly -= cellSize + LINE_H;
        }
      });

      if (grid) {
        const gy = this.y - rowHeight;
        this.page.drawLine({
          start: { x: MARGIN_X, y: gy },
          end: { x: MARGIN_X + this.usableW, y: gy },
          thickness: 0.5,
          color: PALETTE.paper["200"],
        });
      }

      this.y -= rowHeight;
      rowHeights.push(rowHeight);
    }

    return { rowHeights, endY: this.y };
  }

  summary(items: NagalliSummaryItem[], cols = 2) {
    if (this.y < BOTTOM_RESERVE + 24) this.addPage();
    const gap = 16;
    const boxW = (this.usableW - gap * (cols - 1)) / cols;
    const boxH = 26;

    this.y -= 10;
    items.forEach((item, i) => {
      const col = i % cols;
      const rowIdx = Math.floor(i / cols);
      const bx = MARGIN_X + col * (boxW + gap);
      const by = this.y - rowIdx * (boxH + 6);

      this.page.drawRectangle({ x: bx, y: by, width: boxW, height: boxH, color: PALETTE.brand["50"] });
      this.page.drawText(item.label.toUpperCase(), {
        x: bx + 8,
        y: by + boxH - 10,
        size: 6.5,
        font: this.bold,
        color: PALETTE.brand["600"],
      });
      this.page.drawText(item.value, {
        x: bx + 8,
        y: by + 4,
        size: 9.5,
        font: item.valueBold === false ? this.font : this.bold,
        color: PALETTE.ink["900"],
      });
    });

    const rowsUsed = Math.ceil(items.length / cols);
    this.y -= rowsUsed * (boxH + 6) + 10;
  }

  private alignX(align: Align, colWidth: number, x0: number, maxW: number, textWidth: number): number {
    if (align === "center") return x0 + (maxW - textWidth) / 2;
    if (align === "right") return x0 + maxW - textWidth;
    return x0;
  }

  private fitHeaderSize(cols: NagalliCol[], widths: number[], base: number): number {
    let size = base;
    for (let s = base; s >= 6; s--) {
      const fits = cols.every((c, i) => this.bold.widthOfTextAtSize(c.header, s) <= widths[i] - CELL_PAD_X * 2);
      if (fits) {
        size = s;
        break;
      }
    }
    return size;
  }

  async bytes(): Promise<Uint8Array> {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      p.drawText(`Página ${i + 1} de ${total}`, {
        x: MARGIN_X,
        y: 18,
        size: 7,
        font: this.font,
        color: PALETTE.ink["500"],
      });
    });
    return this.pdf.save();
  }
}

export async function createNagalliReport(
  opts: { title: string; subtitle?: string; footerNote?: string }
): Promise<{ report: NagalliReport; logo: PDFImage | null }> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedNagalliLogo(pdf);
  const report = new NagalliReport(pdf, font, bold, logo, opts);
  return { report, logo };
}
