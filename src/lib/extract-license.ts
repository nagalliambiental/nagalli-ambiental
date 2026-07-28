const OCR_API = "https://api.ocr.space/parse/image";

const DATE_PATTERNS = [
  /validade[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /v[aá]lido at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /data\s+de\s+validade[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /v[aá]lida at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /prazo[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
  /at[eé][:\s]*(\d{2})\/(\d{2})\/(\d{4})/i,
];

const LICENCA_PATTERNS = [
  /licen[cç]a\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:da\s+)?licen[cç]a[:\s]*([\d\/\.\-]+)/i,
  /licen[cç]a\s*(?:ambiental)?\s*:?\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*\.?\s*([\d\/\.\-]{3,})/i,
];

const PROTOCOLO_PATTERNS = [
  /protocolo\s*n[º°o]?\s*\.?\s*([\d\/\.\-]+)/i,
  /n[º°o]\s*(?:do\s+)?protocolo[:\s]*([\d\/\.\-]+)/i,
  /protocolo[:\s]*([\d\/\.\-]+)/i,
  /n[º°o]\s*\.?\s*([\d\/\.\-]{3,})\s*\/\s*\d{4}/i,
];

const CONDICIONANTE_MARKERS = [
  /condicionantes?\s*(?:ambientais?)?[:\s]*/i,
  /condi[cç][oõ]es?\s*(?:ambientais?)?[:\s]*/i,
  /restri[cç][oõ]es?\s*[:\s]*/i,
  /exig[eê]ncias?\s*(?:t[eé]cnicas?)?[:\s]*/i,
];

export async function extractFromBuffer(buffer: Buffer, ext: string) {
  let text = "";

  try {
    const blob = new Blob([new Uint8Array(buffer)], { type: `image/${ext === "png" ? "png" : "jpeg"}` });
    const formData = new FormData();
    formData.append("file", blob, `image.${ext}`);
    formData.append("language", "por");
    formData.append("isOverlayRequired", "false");

    const res = await fetch(OCR_API, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("OCR.space error:", res.status);
    } else {
      const json = await res.json();
      if (json.ParsedResults?.[0]?.ParsedText) {
        text = json.ParsedResults[0].ParsedText;
      }
    }
  } catch (err) {
    console.error("OCR failed, falling back to empty text:", err);
  }

  return extractFields(text);
}

export function extractFields(text: string) {
  let validade: string | null = null;
  for (const pat of DATE_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      const [, d, mo, y] = m;
      validade = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      break;
    }
  }

  let numLicenca: string | null = null;
  for (const pat of LICENCA_PATTERNS) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      numLicenca = m[1].trim();
      break;
    }
  }

  let numProtocolo: string | null = null;
  for (const pat of PROTOCOLO_PATTERNS) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2) {
      const val = m[1].trim();
      if (val !== numLicenca) {
        numProtocolo = val;
        break;
      }
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