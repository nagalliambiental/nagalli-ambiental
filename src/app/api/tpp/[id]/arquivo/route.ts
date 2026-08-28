import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const registro = await prisma.autorizacaoTpp.findUnique({
    where: { id: Number(id) },
    select: { arquivo: true, arquivoNome: true },
  });
  if (!registro?.arquivo) {
    return new Response("Arquivo não encontrado", { status: 404 });
  }

  const nome = registro.arquivoNome || `tpp_${id}.pdf`;
  return new Response(new Uint8Array(registro.arquivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Content-Length": String(registro.arquivo.length),
    },
  });
}