import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extrairTextoComOcr } from "@/lib/extract-license";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "docx";
    const buffer = Buffer.from(await file.arrayBuffer());

    let textoExtraido = "";

    if (ext === "docx") {
      try {
        const PizZip = (await import("pizzip")).default;
        const zip = new PizZip(buffer);
        const docXml = zip.file("word/document.xml")?.asText() || "";
        textoExtraido = docXml
          .replace(/<w:p[^>]*>/g, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      } catch {
        // fallback para OCR
      }
    }

    if (!textoExtraido || textoExtraido.replace(/\s+/g, "").length < 20) {
      textoExtraido = await extrairTextoComOcr(buffer, ext === "docx" ? "pdf" : ext);
    }

    const camposBasicos = extrairCamposBasicos(textoExtraido);

    return NextResponse.json({ texto: textoExtraido, campos: camposBasicos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no extract documentos-gerados:", message);
    return NextResponse.json(
      { error: `Erro ao processar documento: ${message}` },
      { status: 500 }
    );
  }
}

function extrairCamposBasicos(texto: string): Record<string, string> {
  const campos: Record<string, string> = {};

  const cnpjMatch = texto.match(/CNPJ\s*[:\s]+\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/i);
  if (cnpjMatch) campos.cnpj = cnpjMatch[1];

  const razaoMatch = texto.match(/raz[aã]o\s+social\s*[:\s]+([^\n]{5,80})/i);
  if (razaoMatch) campos.razaoSocial = razaoMatch[1].trim();

  const telMatch = texto.match(/(?:telefone|tel\.?|fone)\s*[:\s]+([\d\s\(\)\-]{8,20})/i);
  if (telMatch) campos.telefone = telMatch[1].trim();

  const emailMatch = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) campos.email = emailMatch[0];

  const EnderecoMatch = texto.match(/(?:endere[çc]o|rua|av\.)\s*[:\s]+([^\n]{5,100})/i);
  if (EnderecoMatch) campos.endereco = EnderecoMatch[1].trim();

  const municipioMatch = texto.match(/(?:munic[ií]pio|cidade)\s*[:\s]+([A-ZÀ-Ü][a-zà-ü]+(?:\s*[\/]\s*[A-Z]{2})?)/i);
  if (municipioMatch) campos.municipio = municipioMatch[1].trim();

  return campos;
}
