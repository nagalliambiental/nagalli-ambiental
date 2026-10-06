import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { dataInputParaDate } from "@/lib/format";
import { requerAutenticado } from "@/lib/perfil";
import { notificarTarefaNova } from "@/lib/notificacoes";
import { STATUS_TAREFA, PRIORIDADE_TAREFA } from "@/lib/constants";
import { criarExigenciaEspelhada } from "@/lib/tarefas-exigencia";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const tarefas = await prisma.tarefa.findMany({
    where: {
      processoId: Number(id),
      ativo: true,
      ...(req.url.includes("incluiConcluidas=false") ? { status: { not: STATUS_TAREFA.CONCLUIDA } } : {}),
    },
    include: {
      responsavel: { select: { id: true, nome: true } },
      usuario: { select: { id: true, nome: true } },
      empreendimento: { select: { id: true, apelido: true } },
      condicionante: { select: { id: true, titulo: true } },
      _count: { select: { anexos: true } },
    },
    orderBy: [{ prazoFinal: { sort: "asc", nulls: "last" } }, { criadoEm: "desc" }],
  });

  return NextResponse.json(tarefas);
}

export async function POST(req: Request, { params }: Params) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findFirst({
    where: { id: processoId, ativo: true },
    select: { id: true, empreendimentoId: true },
  });
  if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

  try {
    const data = await req.json();
    const titulo = String(data.titulo ?? "").trim();
    if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

    const responsavelId = Number(data.responsavelId ?? data.responsavelPessoaId);
    if (!responsavelId) return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });

    const status = data.status ?? STATUS_TAREFA.NAO_INICIADO;
    if (!Object.values(STATUS_TAREFA).includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    const prioridade = data.prioridade ?? PRIORIDADE_TAREFA.MEDIA;

    const prazoFinal = data.prazoFinal || data.prazoData ? dataInputParaDate(String(data.prazoFinal ?? data.prazoData)) : null;
    const alertaPrazoFinal = Number(data.alertaPrazoFinal ?? data.alertaDias ?? 30);

    const exigenciaId = await criarExigenciaEspelhada({
      processoId,
      titulo,
      descricao: data.descricao ?? null,
      prazoFinal,
      alertaPrazoFinal,
    });

    const tarefa = await prisma.tarefa.create({
      data: {
        titulo,
        descricao: data.descricao?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
        status,
        prioridade,
        prazoFinal,
        alertaPrazoFinal,
        dataLimite: data.dataLimite ? dataInputParaDate(String(data.dataLimite)) : null,
        alertaDataLimite: Number(data.alertaDataLimite ?? data.alertaDataLimite ?? 30),
        dataConclusao: status === STATUS_TAREFA.CONCLUIDA ? new Date() : null,
        responsavelId,
        empreendimentoId: processo.empreendimentoId,
        processoId,
        condicionanteId: data.condicionanteId ? Number(data.condicionanteId) : null,
        exigenciaId,
        usuarioId: Number((authResult.user as { id: string }).id),
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
        _count: { select: { anexos: true } },
      },
    });

    await logAuditoria("criar", "tarefa", tarefa.id, { titulo, processoId }, Number((authResult.user as { id: string }).id));

    await notificarTarefaNova({
      id: tarefa.id,
      titulo,
      responsavelId,
      criadoPorUsuarioId: Number((authResult.user as { id: string }).id),
    });

    return NextResponse.json(tarefa, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tarefa no processo:", error);
    return NextResponse.json({ error: "Erro ao criar tarefa" }, { status: 400 });
  }
}
