import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditoria } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${timestamp}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    const documento = await prisma.documento.create({
      data: {
        nome: file.name,
        tipo: file.type,
        caminho: `/uploads/${safeName}`,
        tamanho: file.size,
        processoId: formData.get("processoId")
          ? Number(formData.get("processoId"))
          : null,
        exigenciaId: formData.get("exigenciaId")
          ? Number(formData.get("exigenciaId"))
          : null,
      },
    });

    await logAuditoria(
      "upload",
      "documento",
      documento.id,
      { nome: file.name, tipo: file.type, tamanho: file.size },
      Number((session.user as { id: string }).id)
    );

    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 400 }
    );
  }
}
