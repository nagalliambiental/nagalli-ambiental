import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { ehPrivilegiado } from "@/lib/perfil";


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const emp = await prisma.empreendimento.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: true,
      processos: {
        include: { orgao: true },
        orderBy: { criadoEm: "desc" },
      },
    },
  });

  if (!emp) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!ehPrivilegiado(perfil) && emp.visibilidade === "privado") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  return NextResponse.json(emp);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  const { id } = await params;
  const body = await request.json();

  const atual = await prisma.empreendimento.findUnique({
    where: { id: Number(id) },
    select: { clienteId: true },
  });
  if (!atual) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  const visibilidade = ehPrivilegiado(perfil) && body.visibilidade === "privado" ? "privado" : "publico";

  const emp = await prisma.empreendimento.update({
    where: { id: Number(id) },
    data: {
      apelido: body.apelido,
      cnpj: body.cnpj ?? null,
      unidadeSinir: body.unidadeSinir ?? null,
      cep: body.cep ?? null,
      municipio: body.municipio ?? null,
      uf: body.uf ?? null,
      rua: body.rua ?? null,
      numero: body.numero ?? null,
      bairro: body.bairro ?? null,
      complemento: body.complemento ?? null,
      descricao: body.descricao,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      utmX: body.utmX ?? null,
      utmY: body.utmY ?? null,
      utmZona: body.utmZona != null ? Number(body.utmZona) : null,
      utmHemisferio: body.utmHemisferio ?? null,
      poligono: body.poligono ?? null,
      clienteId: body.clienteId !== undefined && body.clienteId !== null && body.clienteId !== "" ? Number(body.clienteId) : atual.clienteId,
      visibilidade,
    },
  });

  await logAuditoria("ATUALIZAR", "empreendimento", emp.id, body, Number((session.user as { id: string }).id));
  return NextResponse.json(emp);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!ehPrivilegiado(perfil)) {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  if (body.visibilidade !== "publico" && body.visibilidade !== "privado") {
    return NextResponse.json({ error: "Visibilidade inválida" }, { status: 400 });
  }

  const emp = await prisma.empreendimento.update({
    where: { id: Number(id) },
    data: { visibilidade: body.visibilidade },
  });

  await logAuditoria("ATUALIZAR", "empreendimento", emp.id, { visibilidade: body.visibilidade }, Number((session.user as { id: string }).id));
  return NextResponse.json(emp);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const emp = await prisma.empreendimento.findUnique({ where: { id: Number(id) } });
  if (!emp) {
    return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
  }

  const processoIds = (await prisma.processo.findMany({
    where: { empreendimentoId: Number(id) },
    select: { id: true },
  })).map((p) => p.id);

  await prisma.$transaction([
    prisma.timelineProcesso.deleteMany({ where: { processoId: { in: processoIds } } }),
    prisma.documento.deleteMany({ where: { processoId: { in: processoIds } } }),
    prisma.exigencia.deleteMany({ where: { processoId: { in: processoIds } } }),
    prisma.processo.deleteMany({ where: { id: { in: processoIds } } }),
    prisma.empreendimento.delete({ where: { id: Number(id) } }),
  ]);

  await logAuditoria("EXCLUIR", "empreendimento", Number(id), { apelido: emp.apelido }, Number((session.user as { id: string }).id));
  return NextResponse.json({ mensagem: "Empreendimento excluído" });
}
