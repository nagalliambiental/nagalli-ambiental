const OCR_API = "https://api.ocr.space/parse/image";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
};

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
  /licen[cç]a\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:da\s+)?licen[cç]a[:\s]*([\d\/\.\-]+)/i,
  /licen[cç]a\s*(?:ambiental)?\s*:?\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /licen[cç]a[:\s]*([\d\/\.\-]{3,})/i,
  /n[º°o]\s*\.?\s*([A-Z0-9][\d\/\.\-]{2,})/i,
];

const PROTOCOLO_PATTERNS = [
  /protocolo\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:do\s+)?protocolo[:\s]*([\d\/\.\-]+)/i,
  /protocolo[:\s]*([\d\/\.\-]+)/i,
  /processo[:\s]*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*\.?\s*([\d\/\.\-]{3,})\s*\/\s*\d{4}/i,
];

const CONDICIONANTE_MARKERS = [
  /condicionantes?\s*(?:ambientais?)?[:\s]*/i,
  /condi[cç][oõ]es?\s*(?:ambientais?)?[:\s]*/i,
  /restri[cç][oõ]es?\s*[:\s]*/i,
  /exig[eê]ncias?\s*(?:t[eé]cnicas?)?[:\s]*/i,
];

function mimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] || "image/jpeg";
}

export async function extractFromBuffer(buffer: Buffer, ext: string) {
  let text = "";

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
        text = json.ParsedResults[0].ParsedText;
      }
    }
  } catch (err) {
    console.error("OCR fetch failed:", err);
  }

  console.log("[OCR] extracted text length:", text.length);
  if (text) console.log("[OCR] text preview:", text.slice(0, 500));
  const result = extractFields(text);
  console.log("[OCR] extracted fields:", result);
  return result;
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

  let condicionantes: string | null = null;
  for (const marker of CONDICIONANTE_MARKERS) {
    const idx = text.search(marker);
    if (idx >= 0) {
      let slice = text.slice(idx + text.slice(idx).search(/[:\s]/) + 1).trim();
      const lines: string[] = [];
      for (const line of slice.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (lines.length > 0) break;
          continue;
        }
        if (/^\d{1,2}[\)\.]\s*/.test(trimmed) || trimmed.startsWith("-") || trimmed.startsWith("•")) {
          lines.push(trimmed.replace(/^\d{1,2}[\)\.]\s*/, "").replace(/^[-•]\s*/, "").trim());
        }
      }
      if (lines.length > 0) {
        condicionantes = lines.join("\n");
      }
      break;
    }
  }

  return { validade, numLicenca, numProtocolo, condicionantes };
}