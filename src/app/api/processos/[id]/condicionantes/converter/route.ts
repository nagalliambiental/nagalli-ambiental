import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { classificarCondicionante } from "@/lib/extract-license";

type Params = { params: Promise<{ id: string }> };

function dividirTexto(texto: string): string[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocos: string[] = [];
  let atual: string[] = [];

  const iniciaItem = (l: string) =>
    /^(?:\d+(?:\.\d+)*[.)\-]|\d+\.\d+|[-•*]\s|[a-z]\))/i.test(l);

  for (const linha of linhas) {
    if (iniciaItem(linha)) {
      if (atual.length) blocos.push(atual.join(" "));
      atual = [linha.replace(/^(?:\d+(?:\.\d+)*[.)\-]|[-•*]\s|[a-z]\))\s*/i, "")];
    } else {
      atual.push(linha);
    }
  }
  if (atual.length) blocos.push(atual.join(" "));

  return blocos.filter((b) => b.length > 3);
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const processoId = Number(id);
  const processo = await prisma.processo.findUnique({
    where: { id: processoId },
    select: { condicionantes: true },
  });

  const texto = processo?.condicionantes?.trim() || "";
  if (!texto) {
    return NextResponse.json({ error: "Este processo não tem condicionantes em texto para converter" }, { status: 400 });
  }

  const existentes = await prisma.condicionante.count({ where: { processoId } });
  if (existentes > 0) {
    return NextResponse.json(
      { error: "Já existem condicionantes estruturadas neste processo" },
      { status: 400 }
    );
  }

  const blocos = dividirTexto(texto);
  if (blocos.length === 0) {
    return NextResponse.json({ error: "Não foi possível identificar itens no texto" }, { status: 400 });
  }

  await prisma.condicionante.createMany({
    data: blocos.map((bloco, i) => ({
      processoId,
      titulo: bloco.slice(0, 80) + (bloco.length > 80 ? "…" : ""),
      descricao: bloco.slice(0, 1000),
      tipo: classificarCondicionante(bloco),
      ordem: i + 1,
      origem: "conversao",
    })),
  });

  await logAuditoria("criar", "Condicionante", processoId, { acao: "converterTexto", itens: blocos.length });
  return NextResponse.json({ criados: blocos.length });
}
