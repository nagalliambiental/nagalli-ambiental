import { NextResponse } from "next/server";
import { requerAutenticado } from "@/lib/perfil";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requerAutenticado();
  if (!authResult.ok) return authResult.erro;
  const usuarioId = Number(authResult.user.id);

  const notificacoes = await prisma.notificacao.findMany({
    where: {
      lida: false,
      OR: [{ destinatarioUsuarioId: usuarioId }, { destinatarioUsuarioId: null }],
    },
    orderBy: { dataEnvio: "desc" },
    take: 10,
    select: {
      id: true,
      tipo: true,
      mensagem: true,
      canal: true,
      lida: true,
      dataEnvio: true,
      dataEvento: true,
      tarefaId: true,
      url: true,
    },
  });

  return NextResponse.json(notificacoes);
}
