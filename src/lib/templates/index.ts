export interface TemplateMeta {
  slug: string;
  nome: string;
  descricao: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    slug: "pgrs-pinhais",
    nome: "PGRS Simplificado — Prefeitura de Pinhais",
    descricao:
      "Termo de Referência do Plano de Gerenciamento de Resíduos Sólidos Simplificado do município de Pinhais/PR.",
  },
  {
    slug: "pgrs-curitiba",
    nome: "PGRS Simplificado — Prefeitura de Curitiba",
    descricao:
      "Plano de Gerenciamento de Resíduos Sólidos Simplificado da Secretaria Municipal do Meio Ambiente de Curitiba/PR.",
  },
  {
    slug: "proposta-demolicao",
    nome: "Proposta PGRCC/RGRCC — Demolição",
    descricao:
      "Proposta comercial para elaboração de PGRCC e RGRCC para obras de demolição com cálculo automático por hora técnica.",
  },
];
