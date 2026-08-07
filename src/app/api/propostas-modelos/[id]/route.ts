import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { requerPerfil } from "@/lib/perfil";
import type { Prisma } from "@prisma/client";
import type { CampoProposta } from "@/lib/propostas/modelos";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const { id } = await params;
  const modelo = await prisma.propostaModelo.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      slug: true,
      nome: true,
      descricao: true,
      prefixoArquivo: true,
      campos: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  });

  if (!modelo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ ...modelo, criadoEm: modelo.criadoEm.toISOString(), atualizadoEm: modelo.atualizadoEm.toISOString() });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const userId = Number(user.id);
  const { id } = await params;

  const existente = await prisma.propostaModelo.findUnique({ where: { id: Number(id) } });
  if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const formData = await req.formData();
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) return NextResponse.json({ error: "Informe o nome do modelo" }, { status: 400 });

    let campos: CampoProposta[] = [];
    try {
      campos = JSON.parse(String(formData.get("campos") ?? "[]")) as CampoProposta[];
    } catch {
      return NextResponse.json({ error: "Campos inválidos" }, { status: 400 });
    }

    const data: {
      nome: string;
      descricao: string;
      prefixoArquivo: string;
      campos: Prisma.InputJsonValue;
      template?: Uint8Array<ArrayBuffer>;
      ativo: boolean;
    } = {
      nome,
      descricao: String(formData.get("descricao") ?? "").trim(),
      prefixoArquivo:
        String(formData.get("prefixoArquivo") ?? "").trim() || "Proposta",
      campos: campos as unknown as Prisma.InputJsonValue,
      ativo: formData.get("ativo") !== "false",
    };

    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      data.template = new Uint8Array(await file.arrayBuffer());
    }

    const modelo = await prisma.propostaModelo.update({
      where: { id: Number(id) },
      data,
    });

    await logAuditoria("editar", "propostaModelo", modelo.id, { nome, slug: modelo.slug }, userId);

    return NextResponse.json({ ...modelo, template: modelo.template ? true : false });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar modelo" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const userId = Number(user.id);
  const { id } = await params;

  await prisma.propostaModelo.delete({ where: { id: Number(id) } });
  await logAuditoria("excluir", "propostaModelo", Number(id), {}, userId);

  return NextResponse.json({ ok: true });
}
