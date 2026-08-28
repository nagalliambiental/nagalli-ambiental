import { NextResponse } from "next/server";
import { extractTppFromBuffer } from "@/lib/extract-tpp";
import { auth } from "@/lib/auth";

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

    const ext = file.name.split(".").pop() || "jpg";
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTppFromBuffer(buffer, ext);

    const count = [
      extracted.numero,
      extracted.emitidoEm,
      extracted.validoAte,
      extracted.veiculos,
      extracted.classesRisco,
    ].filter(Boolean).length;
    console.log(`[extract-tpp] ${file.name} (${ext}): ${count} campo(s), numero=${extracted.numero || "-"}`);

    return NextResponse.json(extracted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no extract-tpp:", message);
    return NextResponse.json(
      { error: `Erro ao processar documento: ${message}` },
      { status: 500 }
    );
  }
}