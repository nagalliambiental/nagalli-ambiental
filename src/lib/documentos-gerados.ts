import {
  buildDocxData as buildPinhais,
  renderDocx as renderPinhais,
} from "@/lib/templates/pgrs-pinhais/generate";
import {
  buildDocxData as buildCuritiba,
  renderDocx as renderCuritiba,
} from "@/lib/templates/pgrs-curitiba/generate";
import {
  buildDocxData as buildPgrccIat,
  renderDocx as renderPgrccIat,
} from "@/lib/templates/pgrcc-iat/generate";
import type { PgrsPinhaisFormData } from "@/lib/templates/pgrs-pinhais/config";
import type { PgrsCuritibaFormData } from "@/lib/templates/pgrs-curitiba/config";
import type { PgrccIatFormData } from "@/lib/templates/pgrcc-iat/config";
import type { Cliente, Configuracao } from "@prisma/client";

export function gerarDocumentoBuffer(
  templateSlug: string,
  cliente: Cliente,
  formData: Record<string, unknown>,
  configuracao: Configuracao | null
): { buffer: Buffer; filename: string } {
  const safeNome = (prefixo: string) =>
    `${prefixo}_${cliente.razaoSocial.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

  switch (templateSlug) {
    case "pgrs-pinhais":
      return {
        buffer: renderPinhais(buildPinhais(cliente, formData as unknown as PgrsPinhaisFormData, configuracao)),
        filename: safeNome("PGRS_Pinhais"),
      };
    case "pgrs-curitiba":
      return {
        buffer: renderCuritiba(buildCuritiba(cliente, formData as unknown as PgrsCuritibaFormData, configuracao)),
        filename: safeNome("PGRS_Curitiba"),
      };
    case "pgrcc-iat":
      return {
        buffer: renderPgrccIat(buildPgrccIat(formData as unknown as PgrccIatFormData)),
        filename: safeNome("PGRCC_IAT"),
      };
    default:
      throw new Error("Modelo de documento desconhecido");
  }
}
