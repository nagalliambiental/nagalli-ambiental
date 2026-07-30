use rusqlite::{params, Connection, Result as SqlResult};
use serde_json;

use crate::models::*;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS cliente (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apelido TEXT NOT NULL,
                razao_social TEXT NOT NULL,
                nome_fantasia TEXT,
                cnpj TEXT NOT NULL UNIQUE,
                ativo INTEGER NOT NULL DEFAULT 1,
                rua TEXT,
                numero TEXT,
                bairro TEXT,
                complemento TEXT,
                cep TEXT,
                municipio TEXT,
                uf TEXT,
                telefone TEXT NOT NULL,
                email TEXT NOT NULL,
                resp_legal TEXT NOT NULL,
                criado_em TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS empreendimento (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apelido TEXT NOT NULL,
                ativo INTEGER NOT NULL DEFAULT 1,
                cnpj TEXT,
                cep TEXT,
                municipio TEXT,
                uf TEXT,
                rua TEXT,
                numero TEXT,
                bairro TEXT,
                complemento TEXT,
                descricao TEXT NOT NULL,
                cliente_id INTEGER NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
                criado_em TEXT NOT NULL DEFAULT (datetime('now')),
                atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS orgao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                sigla TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS processo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT NOT NULL,
                ativo INTEGER NOT NULL DEFAULT 1,
                orgao_id INTEGER NOT NULL REFERENCES orgao(id),
                sistema TEXT NOT NULL,
                num_protocolo TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'protocolado',
                validade TEXT,
                empreendimento_id INTEGER NOT NULL REFERENCES empreendimento(id) ON DELETE CASCADE,
                responsavel_id INTEGER,
                observacoes TEXT,
                num_licenca TEXT,
                criado_em TEXT NOT NULL DEFAULT (datetime('now')),
                atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tarefa (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                descricao TEXT,
                ativo INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'pendente',
                prioridade TEXT NOT NULL DEFAULT 'media',
                data_vencimento TEXT,
                status_obs TEXT,
                responsavel_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                criado_em TEXT NOT NULL DEFAULT (datetime('now')),
                atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS financeiro (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_cobranca TEXT NOT NULL,
                valor REAL NOT NULL,
                ativo INTEGER NOT NULL DEFAULT 1,
                forma_pagamento TEXT NOT NULL,
                status_pagamento TEXT NOT NULL DEFAULT 'pendente',
                data_vencimento TEXT,
                data_pagamento TEXT,
                descricao TEXT,
                cliente_id INTEGER NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
                criado_em TEXT NOT NULL DEFAULT (datetime('now')),
                atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sync_queue (
                id TEXT PRIMARY KEY,
                entity TEXT NOT NULL,
                action TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sync_meta (
                entity TEXT PRIMARY KEY,
                last_synced_at TEXT NOT NULL
            );
            "
        )?;
        Ok(())
    }

    // ── Cliente ────────────────────────────────────────────────

    pub fn list_clientes(&self, q: Option<&str>) -> SqlResult<Vec<Cliente>> {
        let mut sql = "SELECT * FROM cliente WHERE 1=1".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        if let Some(query) = q {
            sql.push_str(" AND (apelido LIKE ?1 OR razao_social LIKE ?1 OR cnpj LIKE ?1)");
            params_vec.push(Box::new(format!("%{}%", query)));
        }
        sql.push_str(" ORDER BY apelido ASC");
        let mut stmt = self.conn.prepare(&sql)?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(param_refs.as_slice(), row_to_cliente)?;
        rows.collect()
    }

    pub fn get_cliente(&self, id: i64) -> SqlResult<Cliente> {
        self.conn
            .query_row("SELECT * FROM cliente WHERE id = ?1", params![id], row_to_cliente)
    }

    pub fn save_cliente(&self, input: &ClienteInput) -> SqlResult<Cliente> {
        self.conn.execute(
            "INSERT INTO cliente (apelido, razao_social, nome_fantasia, cnpj, rua, numero, bairro, complemento, cep, municipio, uf, telefone, email, resp_legal)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                input.apelido, input.razao_social, input.nome_fantasia, input.cnpj,
                input.rua, input.numero, input.bairro, input.complemento,
                input.cep, input.municipio, input.uf, input.telefone, input.email, input.resp_legal
            ],
        )?;
        let id = self.conn.last_insert_rowid();
        self.get_cliente(id)
    }

    pub fn delete_cliente(&self, id: i64) -> SqlResult<()> {
        self.conn.execute("DELETE FROM cliente WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Empreendimento ─────────────────────────────────────────

    pub fn list_empreendimentos(&self, q: Option<&str>, cliente_id: Option<i64>) -> SqlResult<Vec<Empreendimento>> {
        let mut sql = "SELECT * FROM empreendimento WHERE 1=1".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        if let Some(cid) = cliente_id {
            sql.push_str(" AND cliente_id = ?1");
            params_vec.push(Box::new(cid));
        }
        if let Some(query) = q {
            sql.push_str(" AND apelido LIKE ?2");
            params_vec.push(Box::new(format!("%{}%", query)));
        }
        sql.push_str(" ORDER BY apelido ASC");
        let mut stmt = self.conn.prepare(&sql)?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(param_refs.as_slice(), row_to_empreendimento)?;
        rows.collect()
    }

    pub fn save_empreendimento(&self, input: &EmpreendimentoInput) -> SqlResult<Empreendimento> {
        self.conn.execute(
            "INSERT INTO empreendimento (apelido, cnpj, cep, municipio, uf, rua, numero, bairro, complemento, descricao, cliente_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                input.apelido, input.cnpj, input.cep, input.municipio, input.uf,
                input.rua, input.numero, input.bairro, input.complemento, input.descricao, input.cliente_id
            ],
        )?;
        let id = self.conn.last_insert_rowid();
        Ok(Empreendimento {
            id,
            apelido: input.apelido.clone(),
            ativo: true,
            cnpj: input.cnpj.clone(),
            cep: input.cep.clone(),
            municipio: input.municipio.clone(),
            uf: input.uf.clone(),
            rua: input.rua.clone(),
            numero: input.numero.clone(),
            bairro: input.bairro.clone(),
            complemento: input.complemento.clone(),
            descricao: input.descricao.clone(),
            cliente_id: input.cliente_id,
        })
    }

    pub fn delete_empreendimento(&self, id: i64) -> SqlResult<()> {
        self.conn.execute("DELETE FROM empreendimento WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Processo ───────────────────────────────────────────────

    pub fn list_processos(&self, empreendimento_id: Option<i64>) -> SqlResult<Vec<Processo>> {
        let mut sql = "SELECT * FROM processo WHERE 1=1".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        if let Some(eid) = empreendimento_id {
            sql.push_str(" AND empreendimento_id = ?1");
            params_vec.push(Box::new(eid));
        }
        sql.push_str(" ORDER BY criado_em DESC");
        let mut stmt = self.conn.prepare(&sql)?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(param_refs.as_slice(), row_to_processo)?;
        rows.collect()
    }

    pub fn save_processo(&self, input: &ProcessoInput) -> SqlResult<Processo> {
        self.conn.execute(
            "INSERT INTO processo (tipo, orgao_id, sistema, num_protocolo, status, validade, empreendimento_id, responsavel_id, observacoes, num_licenca)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                input.tipo, input.orgao_id, input.sistema, input.num_protocolo,
                input.status, input.validade, input.empreendimento_id,
                input.responsavel_id, input.observacoes, input.num_licenca
            ],
        )?;
        let id = self.conn.last_insert_rowid();
        Ok(Processo {
            id,
            tipo: input.tipo.clone(),
            ativo: true,
            orgao_id: input.orgao_id,
            sistema: input.sistema.clone(),
            num_protocolo: input.num_protocolo.clone(),
            status: input.status.clone(),
            validade: input.validade.clone(),
            empreendimento_id: input.empreendimento_id,
            responsavel_id: input.responsavel_id,
            observacoes: input.observacoes.clone(),
            num_licenca: input.num_licenca.clone(),
        })
    }

    // ── Tarefa ─────────────────────────────────────────────────

    pub fn list_tarefas(&self) -> SqlResult<Vec<Tarefa>> {
        let mut stmt = self.conn.prepare("SELECT * FROM tarefa ORDER BY criado_em DESC")?;
        let rows = stmt.query_map([], row_to_tarefa)?;
        rows.collect()
    }

    pub fn save_tarefa(&self, input: &TarefaInput) -> SqlResult<Tarefa> {
        self.conn.execute(
            "INSERT INTO tarefa (titulo, descricao, status, prioridade, data_vencimento, status_obs, responsavel_id, usuario_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                input.titulo, input.descricao, input.status, input.prioridade,
                input.data_vencimento, input.status_obs, input.responsavel_id, input.usuario_id
            ],
        )?;
        let id = self.conn.last_insert_rowid();
        Ok(Tarefa {
            id,
            titulo: input.titulo.clone(),
            descricao: input.descricao.clone(),
            status: input.status.clone(),
            prioridade: input.prioridade.clone(),
            data_vencimento: input.data_vencimento.clone(),
            status_obs: input.status_obs.clone(),
            responsavel_id: input.responsavel_id,
            usuario_id: input.usuario_id,
        })
    }

    // ── Financeiro ─────────────────────────────────────────────

    pub fn list_financeiros(&self, cliente_id: Option<i64>) -> SqlResult<Vec<Financeiro>> {
        let mut sql = "SELECT * FROM financeiro WHERE 1=1".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        if let Some(cid) = cliente_id {
            sql.push_str(" AND cliente_id = ?1");
            params_vec.push(Box::new(cid));
        }
        sql.push_str(" ORDER BY criado_em DESC");
        let mut stmt = self.conn.prepare(&sql)?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(param_refs.as_slice(), row_to_financeiro)?;
        rows.collect()
    }

    pub fn save_financeiro(&self, input: &FinanceiroInput) -> SqlResult<Financeiro> {
        self.conn.execute(
            "INSERT INTO financeiro (tipo_cobranca, valor, forma_pagamento, status_pagamento, data_vencimento, data_pagamento, descricao, cliente_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                input.tipo_cobranca, input.valor, input.forma_pagamento,
                input.status_pagamento, input.data_vencimento, input.data_pagamento,
                input.descricao, input.cliente_id
            ],
        )?;
        let id = self.conn.last_insert_rowid();
        Ok(Financeiro {
            id,
            tipo_cobranca: input.tipo_cobranca.clone(),
            valor: input.valor,
            forma_pagamento: input.forma_pagamento.clone(),
            status_pagamento: input.status_pagamento.clone(),
            data_vencimento: input.data_vencimento.clone(),
            data_pagamento: input.data_pagamento.clone(),
            descricao: input.descricao.clone(),
            cliente_id: input.cliente_id,
        })
    }
}

// ── Row mapper functions ────────────────────────────────────────

fn row_to_cliente(row: &rusqlite::Row) -> SqlResult<Cliente> {
    Ok(Cliente {
        id: row.get("id")?,
        apelido: row.get("apelido")?,
        razao_social: row.get("razao_social")?,
        nome_fantasia: row.get("nome_fantasia")?,
        cnpj: row.get("cnpj")?,
        ativo: row.get::<_, i32>("ativo")? != 0,
        rua: row.get("rua")?,
        numero: row.get("numero")?,
        bairro: row.get("bairro")?,
        complemento: row.get("complemento")?,
        cep: row.get("cep")?,
        municipio: row.get("municipio")?,
        uf: row.get("uf")?,
        telefone: row.get("telefone")?,
        email: row.get("email")?,
        resp_legal: row.get("resp_legal")?,
        criado_em: row.get("criado_em")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_empreendimento(row: &rusqlite::Row) -> SqlResult<Empreendimento> {
    Ok(Empreendimento {
        id: row.get("id")?,
        apelido: row.get("apelido")?,
        ativo: row.get::<_, i32>("ativo")? != 0,
        cnpj: row.get("cnpj")?,
        cep: row.get("cep")?,
        municipio: row.get("municipio")?,
        uf: row.get("uf")?,
        rua: row.get("rua")?,
        numero: row.get("numero")?,
        bairro: row.get("bairro")?,
        complemento: row.get("complemento")?,
        descricao: row.get("descricao")?,
        cliente_id: row.get("cliente_id")?,
    })
}

fn row_to_processo(row: &rusqlite::Row) -> SqlResult<Processo> {
    Ok(Processo {
        id: row.get("id")?,
        tipo: row.get("tipo")?,
        ativo: row.get::<_, i32>("ativo")? != 0,
        orgao_id: row.get("orgao_id")?,
        sistema: row.get("sistema")?,
        num_protocolo: row.get("num_protocolo")?,
        status: row.get("status")?,
        validade: row.get("validade")?,
        empreendimento_id: row.get("empreendimento_id")?,
        responsavel_id: row.get("responsavel_id")?,
        observacoes: row.get("observacoes")?,
        num_licenca: row.get("num_licenca")?,
    })
}

fn row_to_tarefa(row: &rusqlite::Row) -> SqlResult<Tarefa> {
    Ok(Tarefa {
        id: row.get("id")?,
        titulo: row.get("titulo")?,
        descricao: row.get("descricao")?,
        status: row.get("status")?,
        prioridade: row.get("prioridade")?,
        data_vencimento: row.get("data_vencimento")?,
        status_obs: row.get("status_obs")?,
        responsavel_id: row.get("responsavel_id")?,
        usuario_id: row.get("usuario_id")?,
    })
}

fn row_to_financeiro(row: &rusqlite::Row) -> SqlResult<Financeiro> {
    Ok(Financeiro {
        id: row.get("id")?,
        tipo_cobranca: row.get("tipo_cobranca")?,
        valor: row.get("valor")?,
        forma_pagamento: row.get("forma_pagamento")?,
        status_pagamento: row.get("status_pagamento")?,
        data_vencimento: row.get("data_vencimento")?,
        data_pagamento: row.get("data_pagamento")?,
        descricao: row.get("descricao")?,
        cliente_id: row.get("cliente_id")?,
    })
}
