import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { buildBackupWorkbook, registrarBackup } from "@/lib/backup";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!ehPrivilegiado(perfil)) {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("check") === "true") {
    const cfg = await prisma.configuracao.findFirst();
    return NextResponse.json({ ultimoBackupEm: cfg?.ultimoBackupEm ?? null });
  }

  let wb: XLSX.WorkBook;
  try {
    wb = await buildBackupWorkbook();
  } catch (err) {
    console.error("Erro ao gerar backup:", err);
    return NextResponse.json({ error: "Erro ao gerar backup" }, { status: 500 });
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const usuarioId = Number((session.user as { id?: string }).id) || undefined;
  try {
    await registrarBackup(buf, "automatico", usuarioId);
  } catch (err) {
    console.error("Erro ao registrar backup:", err);
    return NextResponse.json({ error: "Erro ao registrar backup" }, { status: 500 });
  }

  const data = new Date().toISOString().split("T")[0];
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="backup-nagalli-${data}.xlsx"`,
    },
  });
}
