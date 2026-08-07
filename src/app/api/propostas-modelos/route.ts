import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { requerPerfil } from "@/lib/perfil";
import type { Prisma } from "@prisma/client";
import type { CampoProposta } from "@/lib/propostas/modelos";

export const dynamic = "force-dynamic";

function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function slugUnico(nome: string): Promise<string> {
  const base = slugify(nome) || "modelo";
  let slug = base;
  let i = 2;
  for (;;) {
    const existente = await prisma.propostaModelo.findUnique({ where: { slug }, select: { id: true } });
    if (!existente) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

export async function GET() {
  const { erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const modelos = await prisma.propostaModelo.findMany({
    orderBy: { nome: "asc" },
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

  return NextResponse.json(
    modelos.map((m) => ({ ...m, criadoEm: m.criadoEm.toISOString(), atualizadoEm: m.atualizadoEm.toISOString() }))
  );
}

export async function POST(req: NextRequest) {
  const { user, erro } = await requerPerfil(["socio", "admin"]);
  if (erro) return erro;

  const userId = Number(user.id);

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

    let template: Uint8Array<ArrayBuffer> | null = null;
    const file = formData.get("file");
    if (file instanceof File) {
      if (file.size === 0) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
      template = new Uint8Array(await file.arrayBuffer());
    }

    const slug = await slugUnico(nome);

    const modelo = await prisma.propostaModelo.create({
      data: {
        slug,
        nome,
        descricao: String(formData.get("descricao") ?? "").trim(),
        prefixoArquivo:
          String(formData.get("prefixoArquivo") ?? "").trim() || "Proposta",
        campos: campos as unknown as Prisma.InputJsonValue,
        template,
      },
    });

    await logAuditoria("criar", "propostaModelo", modelo.id, { slug, nome }, userId);

    return NextResponse.json({ ...modelo, template: modelo.template ? true : false }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao cadastrar modelo" }, { status: 400 });
  }
}
