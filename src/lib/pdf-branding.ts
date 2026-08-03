import fs from "fs";
import path from "path";
import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";

let iconBytes: Buffer | null = null;
let wordmarkBytes: Buffer | null = null;

function readPublicFile(name: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "public", name));
}

export interface BrandLogos {
  icon: PDFImage;
  wordmark: PDFImage;
}

export async function embedBrandLogos(pdf: PDFDocument): Promise<BrandLogos> {
  if (!iconBytes) iconBytes = readPublicFile("Logo.jpeg");
  if (!wordmarkBytes) wordmarkBytes = readPublicFile("Logo1.jpeg");

  const [icon, wordmark] = await Promise.all([
    pdf.embedJpg(iconBytes),
    pdf.embedJpg(wordmarkBytes),
  ]);

  return { icon, wordmark };
}

/** Draws the Nagalli Ambiental logo (icon + wordmark) anchored to the top-left of the page. */
export function drawBrandHeader(page: PDFPage, logos: BrandLogos, marginX: number, topY: number): void {
  const iconSize = 26;
  page.drawImage(logos.icon, { x: marginX, y: topY - iconSize, width: iconSize, height: iconSize });

  const wmHeight = 15;
  const wmWidth = (logos.wordmark.width / logos.wordmark.height) * wmHeight;
  page.drawImage(logos.wordmark, {
    x: marginX + iconSize + 8,
    y: topY - iconSize + (iconSize - wmHeight) / 2,
    width: wmWidth,
    height: wmHeight,
  });
}

/** Draws the copyright notice centered at the bottom of the page. */
export function drawBrandFooter(page: PDFPage, font: PDFFont, pageWidth: number): void {
  const year = new Date().getFullYear();
  const text = `© ${year} Nagalli Ambiental Ltda. Todos os direitos reservados.`;
  const size = 7;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y: 18,
    size,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
}
