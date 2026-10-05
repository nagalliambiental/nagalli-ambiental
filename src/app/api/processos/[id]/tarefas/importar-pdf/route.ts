import { NextResponse } from "next/server";
import { requerAutenticado } from "@/lib/perfil";
import { extrairTarefasDeArquivo } from "@/lib/tarefas-pdf";

type Params = { params: Promise<{ id: string }> };

const EXTENSOES_OK = new Set(["pdf", "jpg", "jpeg", "png", "tiff", "tif", "bmp"]);

export async function POST(req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  await params;

  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!EXTENSOES_OK.has(ext)) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie um PDF ou imagem (JPG, PNG, TIFF, BMP)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const itens = await extrairTarefasDeArquivo(buffer, ext);

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma tarefa identificada no documento. Crie manualmente ou use a importação por planilha." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      itens: itens.map((i) => ({ ...i, texto: i.descricao, prazo: i.prazoFinal })),
      arquivo: file.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao importar tarefas de PDF:", message);
    return NextResponse.json({ error: `Erro ao processar documento: ${message}` }, { status: 500 });
  }
}
