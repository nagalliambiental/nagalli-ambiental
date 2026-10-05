import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { requerAutenticado } from "@/lib/perfil";

type Params = { params: Promise<{ id: string }> };

// Corpo máximo aceito pela função serverless da Vercel (~4,5 MB).
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

const META = { id: true, nome: true, mime: true, tamanho: true, criadoEm: true } as const;

export async function GET(_req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const tarefa = await prisma.tarefa.findFirst({
    where: { id: Number(id), ativo: true },
    select: { id: true },
  });
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const anexos = await prisma.tarefaAnexo.findMany({
    where: { tarefaId: tarefa.id },
    orderBy: { criadoEm: "desc" },
    select: META,
  });

  return NextResponse.json({ anexos });
}

export async function POST(req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const tarefaId = Number(id);
  const tarefa = await prisma.tarefa.findFirst({
    where: { id: tarefaId, ativo: true },
    select: { id: true, titulo: true },
  });
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });

  const arquivos = formData
    .getAll("arquivo")
    .filter((f): f is File => f instanceof File);
  if (arquivos.length === 0) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });

  const erros: string[] = [];
  const salvos: { id: number; nome: string; mime: string; tamanho: number; criadoEm: Date }[] = [];

  for (const file of arquivos) {
    if (file.size === 0) {
      erros.push(`${file.name}: arquivo vazio`);
      continue;
    }
    if (file.size > TAMANHO_MAXIMO) {
      erros.push(`${file.name}: acima do limite de 4 MB`);
      continue;
    }
    try {
      const conteudo = Buffer.from(await file.arrayBuffer());
      const anexo = await prisma.tarefaAnexo.create({
        data: {
          tarefaId,
          nome: file.name || "arquivo",
          mime: file.type || "application/octet-stream",
          tamanho: file.size,
          conteudo,
          criadoPor: Number((authResult.user as { id: string }).id),
        },
        select: META,
      });
      salvos.push(anexo);
    } catch {
      erros.push(`${file.name}: erro ao salvar`);
    }
  }

  if (salvos.length > 0) {
    await logAuditoria("criar", "tarefa", tarefaId, { anexos: salvos.map((a) => a.nome) }, Number((authResult.user as { id: string }).id));
  }

  if (salvos.length === 0) {
    return NextResponse.json({ error: erros.join("; ") || "Nenhum arquivo salvo." }, { status: 400 });
  }

  return NextResponse.json({ anexos: salvos, erros }, { status: 201 });
}
