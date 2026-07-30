use serde::{Deserialize, Serialize};

// ── Cliente ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cliente {
    pub id: i64,
    pub apelido: String,
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub ativo: bool,
    pub rua: Option<String>,
    pub numero: Option<String>,
    pub bairro: Option<String>,
    pub complemento: Option<String>,
    pub cep: Option<String>,
    pub municipio: Option<String>,
    pub uf: Option<String>,
    pub telefone: String,
    pub email: String,
    pub resp_legal: String,
    pub criado_em: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClienteInput {
    pub apelido: String,
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub rua: Option<String>,
    pub numero: Option<String>,
    pub bairro: Option<String>,
    pub complemento: Option<String>,
    pub cep: Option<String>,
    pub municipio: Option<String>,
    pub uf: Option<String>,
    pub telefone: String,
    pub email: String,
    pub resp_legal: String,
}

// ── Empreendimento ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Empreendimento {
    pub id: i64,
    pub apelido: String,
    pub ativo: bool,
    pub cnpj: Option<String>,
    pub cep: Option<String>,
    pub municipio: Option<String>,
    pub uf: Option<String>,
    pub rua: Option<String>,
    pub numero: Option<String>,
    pub bairro: Option<String>,
    pub complemento: Option<String>,
    pub descricao: String,
    pub cliente_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmpreendimentoInput {
    pub apelido: String,
    pub cnpj: Option<String>,
    pub cep: Option<String>,
    pub municipio: Option<String>,
    pub uf: Option<String>,
    pub rua: Option<String>,
    pub numero: Option<String>,
    pub bairro: Option<String>,
    pub complemento: Option<String>,
    pub descricao: String,
    pub cliente_id: i64,
}

// ── Processo ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Processo {
    pub id: i64,
    pub tipo: String,
    pub ativo: bool,
    pub orgao_id: i64,
    pub sistema: String,
    pub num_protocolo: String,
    pub status: String,
    pub validade: Option<String>,
    pub empreendimento_id: i64,
    pub responsavel_id: Option<i64>,
    pub observacoes: Option<String>,
    pub num_licenca: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessoInput {
    pub tipo: String,
    pub orgao_id: i64,
    pub sistema: String,
    pub num_protocolo: String,
    pub status: String,
    pub validade: Option<String>,
    pub empreendimento_id: i64,
    pub responsavel_id: Option<i64>,
    pub observacoes: Option<String>,
    pub num_licenca: Option<String>,
}

// ── Tarefa ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tarefa {
    pub id: i64,
    pub titulo: String,
    pub descricao: Option<String>,
    pub status: String,
    pub prioridade: String,
    pub data_vencimento: Option<String>,
    pub status_obs: Option<String>,
    pub responsavel_id: i64,
    pub usuario_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TarefaInput {
    pub titulo: String,
    pub descricao: Option<String>,
    pub status: String,
    pub prioridade: String,
    pub data_vencimento: Option<String>,
    pub status_obs: Option<String>,
    pub responsavel_id: i64,
    pub usuario_id: i64,
}

// ── Financeiro ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Financeiro {
    pub id: i64,
    pub tipo_cobranca: String,
    pub valor: f64,
    pub forma_pagamento: String,
    pub status_pagamento: String,
    pub data_vencimento: Option<String>,
    pub data_pagamento: Option<String>,
    pub descricao: Option<String>,
    pub cliente_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceiroInput {
    pub tipo_cobranca: String,
    pub valor: f64,
    pub forma_pagamento: String,
    pub status_pagamento: String,
    pub data_vencimento: Option<String>,
    pub data_pagamento: Option<String>,
    pub descricao: Option<String>,
    pub cliente_id: i64,
}

// ── Orgao ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Orgao {
    pub id: i64,
    pub nome: String,
    pub sigla: String,
}

// ── Sync ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncQueueItem {
    pub id: String,
    pub entity: String,
    pub action: String,
    pub payload: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub pushed: usize,
    pub pulled: usize,
    pub errors: Vec<String>,
}

// ── API response shapes ─────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ApiListResponse<T> {
    pub data: Vec<T>,
}
