import { NextResponse } from "next/server";
import { requerAutenticado } from "@/lib/perfil";
import { gerarModeloTarefasXlsx } from "@/lib/tarefas-import";

export async function GET() {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const buf = gerarModeloTarefasXlsx();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-tarefas.xlsx"',
    },
  });
}
