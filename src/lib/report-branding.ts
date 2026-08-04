import fs from "fs";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export const PALETTE = {
  brand: {
    "50": rgb(0.933, 0.953, 0.906),
    "500": rgb(0.325, 0.506, 0.212),
    "600": rgb(0.267, 0.42, 0.173),
    "700": rgb(0.212, 0.337, 0.137),
  },
  river: {
    "100": rgb(0.906, 0.933, 0.976),
    "500": rgb(0.557, 0.667, 0.855),
    "700": rgb(0.298, 0.424, 0.627),
  },
  paper: {
    "0": rgb(0.984, 0.98, 0.969),
    "50": rgb(0.961, 0.953, 0.933),
    "100": rgb(0.925, 0.914, 0.882),
    "200": rgb(0.875, 0.859, 0.812),
  },
  ink: {
    "300": rgb(0.639, 0.659, 0.588),
    "500": rgb(0.42, 0.451, 0.384),
    "700": rgb(0.239, 0.271, 0.212),
    "900": rgb(0.118, 0.141, 0.094),
  },
};

export const NAGALLI_VERDE = PALETTE.brand["600"];
export const NAGALLI_CINZA = PALETTE.ink["500"];
export const NAGALLI_LINHA = PALETTE.paper["200"];

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
