import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const responsaveis = await prisma.responsavel.findMany({
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(responsaveis);
}
