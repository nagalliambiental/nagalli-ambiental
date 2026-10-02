import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractFromBuffer } from "@/lib/extract-license";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "pdf";
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractFromBuffer(buffer, ext);

    return NextResponse.json({
      validade: extracted.validade,
      numero: extracted.numLicenca,
      orgao: extracted.orgaoSigla,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no extract de PGRS:", message);
    return NextResponse.json({ error: `Erro ao processar documento: ${message}` }, { status: 500 });
  }
}
