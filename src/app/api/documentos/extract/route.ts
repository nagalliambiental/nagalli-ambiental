import { NextResponse } from "next/server";
import { extractFromBuffer } from "@/lib/extract-license";
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
    const extracted = await extractFromBuffer(buffer, ext);

    return NextResponse.json({ validade: null, numLicenca: null, numProtocolo: null, condicionantes: null, ...extracted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no extract:", message);
    return NextResponse.json(
      { error: `Erro ao processar documento: ${message}` },
      { status: 500 }
    );
  }
}