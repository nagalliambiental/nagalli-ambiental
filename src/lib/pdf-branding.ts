import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import { LOGO_ICON_BASE64, LOGO_WORDMARK_BASE64 } from "@/lib/brand-assets";

export interface BrandLogos {
  icon: PDFImage;
  wordmark: PDFImage;
}

export async function embedBrandLogos(pdf: PDFDocument): Promise<BrandLogos> {
  const [icon, wordmark] = await Promise.all([
    pdf.embedJpg(Buffer.from(LOGO_ICON_BASE64, "base64")),
    pdf.embedJpg(Buffer.from(LOGO_WORDMARK_BASE64, "base64")),
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
