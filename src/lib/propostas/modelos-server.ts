import { prisma } from "@/lib/prisma";
import {
  getModelosEmbutidos,
  getModeloEmbutido,
  type ModeloPropostaData,
} from "./modelos";

function toData(
  m: {
    slug: string;
    nome: string;
    descricao: string;
    prefixoArquivo: string;
    campos: unknown;
  }
): ModeloPropostaData {
  return {
    slug: m.slug,
    nome: m.nome,
    descricao: m.descricao,
    prefixoArquivo: m.prefixoArquivo,
    codigo: null,
    campos: (m.campos ?? []) as ModeloPropostaData["campos"],
  };
}

export async function getModelosProposta(): Promise<ModeloPropostaData[]> {
  const embutidos = getModelosEmbutidos();
  const registrados = await prisma.propostaModelo.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      slug: true,
      nome: true,
      descricao: true,
      prefixoArquivo: true,
      campos: true,
    },
  });
  return [...embutidos, ...registrados.map(toData)];
}

export async function getModeloProposta(
  slug: string
): Promise<ModeloPropostaData | null> {
  const embutido = getModeloEmbutido(slug);
  if (embutido) return embutido;

  const m = await prisma.propostaModelo.findUnique({
    where: { slug },
    select: {
      slug: true,
      nome: true,
      descricao: true,
      prefixoArquivo: true,
      campos: true,
    },
  });
  return m ? toData(m) : null;
}

export async function getModeloTemplateBytes(
  slug: string
): Promise<Uint8Array | null> {
  if (getModeloEmbutido(slug)) return null;
  const m = await prisma.propostaModelo.findUnique({
    where: { slug },
    select: { template: true },
  });
  return m?.template ?? null;
}
