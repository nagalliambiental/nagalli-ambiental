import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listarResponsaveis } from "@/lib/responsaveis";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const responsaveis = await listarResponsaveis();

  return NextResponse.json(responsaveis);
}
