export interface TemplateMeta {
  slug: string;
  nome: string;
  descricao: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    slug: "pgrcc-iat",
    nome: "PGRCC — IAT",
    descricao:
      "Projeto Simplificado de Gerenciamento de Resíduos da Construção Civil (PGRCC), conforme Termo de Referência do IAT.",
  },
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
    slug: "pgrs-sj-pinhais",
    nome: "PGRS Simplificado — São José dos Pinhais",
    descricao:
      "Formulário de Plano de Gerenciamento de Resíduos Sólidos do município de São José dos Pinhais/PR.",
  },
];
