import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { gerarDocumentoBuffer } from "@/lib/documentos-gerados";
import { readFile, unlink, writeFile, mkdir } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documentoGerado.findUnique({ where: { id: Number(id) } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  let buffer: Buffer | null = null;
  let filename = "";

  if (doc.conteudo) {
    buffer = Buffer.from(doc.conteudo);
  }

  if (!buffer && doc.caminho) {
    try {
      buffer = await readFile(path.join(process.cwd(), "public", doc.caminho));
      filename = path.basename(doc.caminho);
    } catch {
      // arquivo ausente em disco; regenera abaixo
    }
  }

  if (!buffer) {
    try {
      const cliente = await prisma.cliente.findUnique({ where: { id: doc.clienteId } });
      if (!cliente) {
        return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
      }
      const configuracao = await prisma.configuracao.findFirst();
      const resultado = gerarDocumentoBuffer(
        doc.templateSlug,
        cliente,
        (doc.dadosSnapshot ?? {}) as Record<string, unknown>,
        configuracao
      );
      buffer = resultado.buffer;
      filename = resultado.filename;

      let caminhoRelativo: string | null = doc.caminho;
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "documentos-gerados");
        await mkdir(uploadDir, { recursive: true });
        const safeName = `${Date.now()}-${filename}`;
        caminhoRelativo = `/uploads/documentos-gerados/${safeName}`;
        await writeFile(path.join(uploadDir, safeName), buffer);
      } catch {
        // ambiente sem escrita em disco - o conteúdo fica no banco
      }
      await prisma.documentoGerado.update({
        where: { id: doc.id },
        data: { caminho: caminhoRelativo, conteudo: new Uint8Array(buffer) },
      });
    } catch (err) {
      console.error("Erro ao regenerar o documento:", err);
      return NextResponse.json({ error: "Não foi possível gerar o documento" }, { status: 500 });
    }
  }

  await logAuditoria(
    "DOWNLOAD",
    "DocumentoGerado",
    doc.id,
    { templateSlug: doc.templateSlug },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documentoGerado.findUnique({ where: { id: Number(id) } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const { formData, empreendimentoId } = body;

  if (!formData || typeof formData !== "object") {
    return NextResponse.json({ error: "Dados do formulario invalidos" }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: doc.clienteId } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
  }

  const configuracao = await prisma.configuracao.findFirst();

  let buffer: Buffer;
  let filename: string;
  let caminhoRelativo: string | null = doc.caminho;

  try {
    const resultado = gerarDocumentoBuffer(doc.templateSlug, cliente, formData, configuracao);
    buffer = resultado.buffer;
    filename = resultado.filename;

    try {
      if (doc.caminho) {
        await unlink(path.join(process.cwd(), "public", doc.caminho)).catch(() => {});
      }
      const uploadDir = path.join(process.cwd(), "public", "uploads", "documentos-gerados");
      await mkdir(uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${filename}`;
      caminhoRelativo = `/uploads/documentos-gerados/${safeName}`;
      await writeFile(path.join(uploadDir, safeName), buffer);
    } catch {
      // ambiente sem escrita em disco
    }
  } catch (err) {
    console.error("Erro ao regenerar o documento:", err);
    return NextResponse.json({ error: "Erro ao gerar o documento" }, { status: 500 });
  }

  await prisma.documentoGerado.update({
    where: { id: doc.id },
    data: {
      dadosSnapshot: formData,
      caminho: caminhoRelativo,
      conteudo: new Uint8Array(buffer),
      empreendimentoId: empreendimentoId ? Number(empreendimentoId) : null,
    },
  });

  await logAuditoria(
    "ATUALIZAR",
    "DocumentoGerado",
    doc.id,
    { templateSlug: doc.templateSlug },
    session.user?.id ? Number(session.user.id) : undefined
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.documentoGerado.findUnique({ where: { id: Number(id) } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  if (doc.caminho) {
    try {
      await unlink(path.join(process.cwd(), "public", doc.caminho));
    } catch {
      // arquivo já não existe em disco; segue para remover o registro
    }
  }

  await prisma.documentoGerado.delete({ where: { id: Number(id) } });

  await logAuditoria(
    "EXCLUIR",
    "DocumentoGerado",
    Number(id),
    { templateSlug: doc.templateSlug },
    Number((session.user as { id: string }).id)
  );

  return NextResponse.json({ ok: true });
}
