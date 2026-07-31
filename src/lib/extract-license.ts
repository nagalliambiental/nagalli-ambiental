const OCR_API = "https://api.ocr.space/parse/image";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
};

const CONDICIONANTES_HEADERS = [
  /^\s*4\.\s*CONDICIONANTES\s*$/i,
  /^\s*CONDICIONANTES\s*$/i,
  /CONDICIONANTES\s+D[AE]?\s+(?:LICEN[ÇC]A|AUTORIZA[ÇC][ÃA]O)/i,
];

const CONDICIONANTES_FOOTERS = [
  /P[aá]gina \d+\/2/,
  /Esta LICEN[ÇC]A/,
  /Assinatura do Representante/,
  /^\s*\d+\s*$/,
];

const DATE_PATTERNS = [
  /validade[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /v[aá]lido at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /data\s+de\s+validade[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /v[aá]lida at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /prazo[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /(\d{2})\/(\d{2})\/(\d{4})/,
];

const LICENCA_PATTERNS = [
  /n[úu]mero\s+do\s+documento[^\d\n]*[\n\r\s]*(\d{3,})/i,
  /LICEN[ÇC]A\s+PR[ÉE]VIA[\n\r\s]+(\d{3,})/i,
  /licen[cç]a\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:da\s+)?licen[cç]a[:\s]*([\d\/\.\-]+)/i,
  /licen[cç]a\s*(?:ambiental)?\s*:?\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /licen[cç]a[:\s]*([\d\/\.\-]{3,})/i,
  /n[º°o]\s*\.?\s*([A-Z0-9][\d\/\.\-]{2,})/i,
];

const PROTOCOLO_PATTERNS = [
  /n[úu]mero\s+do\s+protocolo[^\d]*?([\d][\d\.\/\-]{4,})/i,
  /protocolo\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:do\s+)?protocolo[:\s]*([\d\/\.\-]+)/i,
  /protocolo[:\s]*([\d\/\.\-]+)/i,
  /processo[:\s]*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*\.?\s*([\d\/\.\-]{3,})\s*\/\s*\d{4}/i,
];

function mimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] || "image/jpeg";
}

function extractCondicionantes(text: string): string | null {
  if (!text) return null;

  let start = -1;
  let headerLen = 0;
  for (const re of CONDICIONANTES_HEADERS) {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      start = m.index + m[0].length;
      headerLen = m[0].length;
      break;
    }
  }
  if (start === -1) {
    const m = text.match(/CONDICIONANTES/i);
    if (m && m.index !== undefined) {
      start = m.index + m[0].length;
    } else {
      return null;
    }
  }

  let end = text.length;
  for (const re of CONDICIONANTES_FOOTERS) {
    const m = text.slice(start).match(re);
    if (m && m.index !== undefined && start + m.index < end) {
      end = start + m.index;
    }
  }

  let sec = text.slice(start, end);

  const artifact = /^\s*(?:P[aá]gina\s+\d+(?:\/LP|\/\d+)?[^\S\r\n]*|LP\s+N[º°o]?\s*\d+|Instituto [ÁA]gua e Terra|Rua Engenheiros Rebou[çc]as.*|EM BRANCO.*)\s*$/gm;
  sec = sec.replace(artifact, "").replace(/\n{3,}/g, "\n\n").trim();

  if (!sec) return null;
  return sec;
}

export async function extractFromBuffer(buffer: Buffer, ext: string) {
  let text = "";

  if (ext.toLowerCase() === "pdf") {
    try {
      const parsed = await pdfParse(buffer);
      if (parsed?.text) text = parsed.text;
    } catch (err) {
      console.error("[PDF] native text extraction failed, falling back to OCR:", err);
    }
  }

  if (!text || text.replace(/\s+/g, "").length < 30) {
    text = await runOcr(buffer, ext);
  }

  console.log("[EXTRACT] text length:", text.length);
  if (text) console.log("[EXTRACT] text preview:", text.slice(0, 500));
  const result = extractFields(text);
  console.log("[EXTRACT] extracted fields:", result);
  return result;
}

async function runOcr(buffer: Buffer, ext: string): Promise<string> {
  try {
    const mime = mimeType(ext);
    const blob = new Blob([new Uint8Array(buffer)], { type: mime });
    const formData = new FormData();
    formData.append("file", blob, `document.${ext}`);
    formData.append("apikey", process.env.OCR_API_KEY || "helloworld");
    formData.append("language", "por");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", process.env.OCR_ENGINE || "1");
    formData.append("scale", "true");
    formData.append("detectOrientation", "true");

    const res = await fetch(OCR_API, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("OCR.space HTTP error:", res.status, await res.text().catch(() => ""));
    } else {
      const json = await res.json();
      if (json.IsErroredOnProcessing) {
        console.error("OCR.space processing error:", json.ErrorMessage);
      } else if (json.ParsedResults?.[0]?.ParsedText) {
        return json.ParsedResults[0].ParsedText;
      }
    }
  } catch (err) {
    console.error("OCR fetch failed:", err);
  }
  return "";
}

export function extractFields(text: string) {
  let validade: string | null = null;
  for (const pat of DATE_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      const [, d, mo, y] = m;
      const dia = parseInt(d, 10);
      const mes = parseInt(mo, 10);
      const ano = parseInt(y, 10);
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
        validade = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
        break;
      }
    }
  }

  let numLicenca: string | null = null;
  for (const pat of LICENCA_PATTERNS) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      const raw = m[1].trim();
      if (raw.split("/").length === 3) continue;
      if (!/^\d+$/.test(raw.replace(/[\/\-\.]/g, ""))) continue;
      numLicenca = raw;
      break;
    }
  }

  let numProtocolo: string | null = null;
  for (const pat of PROTOCOLO_PATTERNS) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      const raw = m[1].trim();
      if (raw === numLicenca) continue;
      numProtocolo = raw;
      break;
    }
  }

  return {
    validade,
    numLicenca,
    numProtocolo,
    condicionantes: extractCondicionantes(text),
  };
}