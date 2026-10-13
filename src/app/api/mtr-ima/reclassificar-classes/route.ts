import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { baixarManifestoPdfPortal } from "@/lib/mtr-ima-portal";
import { extrairClasseMtrImaPdf } from "@/lib/mtr-ima-classificacao";

export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const conexaoId = Number(body.conexaoId);
  if (!conexaoId) return NextResponse.json({ error: "conexaoId é obrigatório" }, { status: 400 });

  const manifestos = await prisma.mtrImaManifesto.findMany({
    where: { conexaoId, OR: [{ classeNome: null }, { classeNome: "" }] },
    orderBy: { dataExpedicao: "desc" },
    select: { id: true, numero: true },
  });

  const classificados: { id: number; numero: string; classeNome: string }[] = [];
  const falhas: { id: number; numero: string; erro: string }[] = [];

  for (const manifesto of manifestos) {
    try {
      const pdf = await baixarManifestoPdfPortal(conexaoId, manifesto.numero);
      const classeNome = await extrairClasseMtrImaPdf(pdf.buffer);
      if (!classeNome) {
        falhas.push({ id: manifesto.id, numero: manifesto.numero, erro: "Classe não encontrada no PDF" });
        continue;
      }
      await prisma.mtrImaManifesto.update({ where: { id: manifesto.id }, data: { classeNome } });
      classificados.push({ id: manifesto.id, numero: manifesto.numero, classeNome });
    } catch (erro) {
      falhas.push({ id: manifesto.id, numero: manifesto.numero, erro: erro instanceof Error ? erro.message : "Falha ao consultar PDF" });
    }
  }

  await logAuditoria(
    "ATUALIZAR",
    "MtrImaManifesto",
    conexaoId,
    { acao: "reclassificar_classes", total: manifestos.length, classificados: classificados.length, falhas: falhas.length },
    session.user?.id ? Number(session.user.id) : undefined,
  );

  return NextResponse.json({ total: manifestos.length, classificados: classificados.length, falhas: falhas.length, itens: classificados, erros: falhas });
}
