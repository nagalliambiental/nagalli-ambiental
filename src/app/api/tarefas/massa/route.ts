import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { dataInputParaDate } from "@/lib/format";
import { requerAutenticado } from "@/lib/perfil";
import { STATUS_TAREFA, PRIORIDADE_TAREFA } from "@/lib/constants";
import { criarExigenciaEspelhada } from "@/lib/tarefas-exigencia";

export async function POST(req: Request) {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;

  const body = await req.json().catch(() => ({}));
  const titulo = String(body.titulo ?? "").trim();
  const responsavelId = body.responsavelId ? Number(body.responsavelId) : null;
  const rawIds: unknown = body.processoIds;
  const processoIds = Array.isArray(rawIds)
    ? [...new Set(rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];

  if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  if (!responsavelId) return NextResponse.json({ error: "Responsável é obrigatório" }, { status: 400 });
  if (processoIds.length === 0) return NextResponse.json({ error: "Selecione ao menos um processo" }, { status: 400 });

  const status = body.status ?? STATUS_TAREFA.NAO_INICIADO;
  if (!Object.values(STATUS_TAREFA).includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  const prioridade = body.prioridade ?? PRIORIDADE_TAREFA.MEDIA;
  if (!Object.values(PRIORIDADE_TAREFA).includes(prioridade)) {
    return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 });
  }

  const descricao = String(body.descricao ?? "").trim() || null;
  const observacoes = String(body.observacoes ?? "").trim() || null;
  const prazoFinal = body.prazoFinal ? dataInputParaDate(String(body.prazoFinal)) : null;
  const alertaPrazoFinal = body.alertaPrazoFinal != null && body.alertaPrazoFinal !== "" ? Number(body.alertaPrazoFinal) : 30;
  const dataLimite = body.dataLimite ? dataInputParaDate(String(body.dataLimite)) : null;
  const alertaDataLimite = body.alertaDataLimite != null && body.alertaDataLimite !== "" ? Number(body.alertaDataLimite) : 30;
  const condicionanteId = body.condicionanteId ? Number(body.condicionanteId) : null;
  const usuarioId = Number((authResult.user as { id: string }).id);

  try {
    const processos = await prisma.processo.findMany({
      where: { id: { in: processoIds }, ativo: true },
      select: { id: true, empreendimentoId: true },
    });
    if (processos.length === 0) {
      return NextResponse.json({ error: "Nenhuma licença válida selecionada" }, { status: 400 });
    }

    let criadas = 0;
    for (const processo of processos) {
      const exigenciaId = await criarExigenciaEspelhada({
        processoId: processo.id,
        titulo,
        descricao,
        prazoFinal,
        alertaPrazoFinal,
      });

      const tarefa = await prisma.tarefa.create({
        data: {
          titulo,
          descricao,
          observacoes,
          status,
          prioridade,
          prazoFinal,
          alertaPrazoFinal,
          dataLimite,
          alertaDataLimite,
          responsavelId,
          empreendimentoId: processo.empreendimentoId,
          processoId: processo.id,
          condicionanteId,
          exigenciaId,
          usuarioId,
        },
        select: { id: true },
      });

      await logAuditoria("criar", "tarefa", tarefa.id, { titulo, massa: true, processoId: processo.id }, usuarioId);
      criadas++;
    }

    return NextResponse.json({ criadas }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar tarefas em massa:", error);
    return NextResponse.json({ error: "Erro ao criar tarefas em massa." }, { status: 500 });
  }
}
