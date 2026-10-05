import { NextResponse } from "next/server";
import { logAuditoria } from "@/lib/audit";
import { requerAutenticado } from "@/lib/perfil";
import { importarTarefasXlsx } from "@/lib/tarefas-import";

export async function POST(req: Request) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo XLSX obrigatório" }, { status: 400 });
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json({ error: "Envie um arquivo Excel (.xlsx)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const usuarioId = Number((authResult.user as { id: string }).id);
    const { importId, criadas, exigenciasCriadas, erros } = await importarTarefasXlsx(buffer, usuarioId);

    if (criadas > 0) {
      await logAuditoria("criar", "tarefa", 0, { importacao: importId, arquivo: file.name, criadas }, usuarioId);
    }

    return NextResponse.json({ importId, criadas, exigenciasCriadas, erros, fileName: file.name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar";
    return NextResponse.json({ error: `Erro ao importar: ${msg}` }, { status: 500 });
  }
}
