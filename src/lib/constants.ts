export const PERFIS = {
  SOCIO: "socio",
  ADMIN: "admin",
  TECNICO: "tecnico",
} as const;

export type Perfil = (typeof PERFIS)[keyof typeof PERFIS];

export const STATUS_PROCESSO = {
  PROTOCOLADO: "protocolado",
  EM_ANALISE: "em_analise",
  DEFERIDO: "deferido",
  INDEFERIDO: "indeferido",
  ARQUIVADO: "arquivado",
  CANCELADO: "cancelado",
} as const;

export type StatusProcesso = (typeof STATUS_PROCESSO)[keyof typeof STATUS_PROCESSO];

export const STATUS_PAGAMENTO = {
  PENDENTE: "pendente",
  PAGO: "pago",
  ATRASADO: "atrasado",
  CANCELADO: "cancelado",
} as const;

export type StatusPagamento = (typeof STATUS_PAGAMENTO)[keyof typeof STATUS_PAGAMENTO];

export const STATUS_TAREFA = {
  PENDENTE: "pendente",
  EM_ANDAMENTO: "em_andamento",
  CONCLUIDA: "concluida",
  CANCELADA: "cancelada",
} as const;

export type StatusTarefa = (typeof STATUS_TAREFA)[keyof typeof STATUS_TAREFA];

export const PRIORIDADE_TAREFA = {
  ALTA: "alta",
  MEDIA: "media",
  BAIXA: "baixa",
} as const;

export type PrioridadeTarefa = (typeof PRIORIDADE_TAREFA)[keyof typeof PRIORIDADE_TAREFA];

export const TIPO_DOCUMENTO = {
  LICENCA: "licenca",
  PARECER: "parecer",
  OFICIO: "oficio",
  LAUDO: "laudo",
  RELATORIO: "relatorio",
  CONTRATO: "contrato",
  ANEXO: "anexo",
  OUTRO: "outro",
} as const;

export type TipoDocumento = (typeof TIPO_DOCUMENTO)[keyof typeof TIPO_DOCUMENTO];

export const VISIBILIDADE = {
  PUBLICO: "publico",
  PRIVADO: "privado",
} as const;

export type Visibilidade = (typeof VISIBILIDADE)[keyof typeof VISIBILIDADE];

export const STATUS_EXIGENCIA = {
  PENDENTE: "pendente",
  EM_ANDAMENTO: "em_andamento",
  CUMPRIDA: "cumprida",
} as const;

export type StatusExigencia = (typeof STATUS_EXIGENCIA)[keyof typeof STATUS_EXIGENCIA];

export const STATUS_COMPENSACAO = {
  PENDENTE: "pendente",
  EM_ANDAMENTO: "em_andamento",
  CONCLUIDA: "concluida",
} as const;

export type StatusCompensacao = (typeof STATUS_COMPENSACAO)[keyof typeof STATUS_COMPENSACAO];

export const ORIGEM_BACKUP = {
  AUTOMATICO: "automatico",
  MANUAL: "manual",
} as const;

export type OrigemBackup = (typeof ORIGEM_BACKUP)[keyof typeof ORIGEM_BACKUP];

export const STATUS_PROPOSTA = {
  RASCUNHO: "rascunho",
  ENVIADA: "enviada",
  APROVADA: "aprovada",
  RECUSADA: "recusada",
} as const;

export type StatusProposta = (typeof STATUS_PROPOSTA)[keyof typeof STATUS_PROPOSTA];
