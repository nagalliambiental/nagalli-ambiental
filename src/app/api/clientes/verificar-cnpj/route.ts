import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encontrarConflitoCnpj } from "@/lib/cliente-cnpj";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const cnpj = request.nextUrl.searchParams.get("cnpj") || "";
  const excluirIdRaw = request.nextUrl.searchParams.get("excluirId");

  const conflito = await encontrarConflitoCnpj(
    prisma,
    cnpj,
    excluirIdRaw ? Number(excluirIdRaw) : undefined
  );

  return NextResponse.json({
    existe: Boolean(conflito),
    cliente: conflito,
  });
}