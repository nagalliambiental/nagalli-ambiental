import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseDmrSheet } from "@/lib/dmr-parser";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const result = parseDmrSheet(buffer);
  return NextResponse.json(result);
}
