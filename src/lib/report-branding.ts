import fs from "fs";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export const NAGALLI_VERDE = rgb(0.21, 0.34, 0.14);
export const NAGALLI_CINZA = rgb(0.42, 0.42, 0.42);
export const NAGALLI_LINHA = rgb(0.75, 0.78, 0.72);

const MARGIN_X = 40;
const COPYRIGHT = "Proibida a cópia e distribuição. Todos os direitos reservados.";

let cachedLogoBytes: Uint8Array | null | undefined;

export function getNagalliLogoBytes(): Uint8Array | null {
  if (cachedLogoBytes !== undefined) return cachedLogoBytes;
  try {
    cachedLogoBytes = fs.readFileSync(path.join(process.cwd(), "public", "Logo.jpeg"));
  } catch {
    cachedLogoBytes = null;
  }
  return cachedLogoBytes;
}

export async function embedNagalliLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  const bytes = getNagalliLogoBytes();
  if (!bytes) return null;
  try {
    return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

export function drawNagalliTopo(page: PDFPage, logo: PDFImage | null, font: PDFFont, bold: PDFFont): number {
  const { width, height } = page.getSize();
  const logoH = 40;
  const logoW = logo ? (logoH * logo.width) / logo.height : 0;
  const top = height - 12;

  if (logo) {
    page.drawImage(logo, { x: MARGIN_X, y: top - logoH, width: logoW, height: logoH });
  }

  const textX = MARGIN_X + logoW + 10;
  page.drawText("NAGALLI AMBIENTAL", { x: textX, y: top - 14, size: 13, font: bold, color: NAGALLI_VERDE });
  page.drawText("Gestão Ambiental", { x: textX, y: top - 26, size: 8.5, font, color: NAGALLI_CINZA });
  page.drawRectangle({ x: MARGIN_X, y: top - logoH - 8, width: width - MARGIN_X * 2, height: 0.8, color: NAGALLI_LINHA });

  return top - logoH - 15;
}

export function drawNagalliFooter(page: PDFPage, font: PDFFont, bold: PDFFont): void {
  const { width } = page.getSize();
  page.drawRectangle({ x: MARGIN_X, y: 26, width: width - MARGIN_X * 2, height: 0.6, color: NAGALLI_LINHA });
  page.drawText("© Nagalli Ambiental", { x: MARGIN_X, y: 18, size: 8, font: bold, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(COPYRIGHT, { x: MARGIN_X + 100, y: 18, size: 8, font, color: NAGALLI_CINZA });
}
