/**
 * Tauri adapter — seamless desktop integration.
 *
 * When running inside the Tauri shell (window.__TAURI_INTERNALS__ exists),
 * it calls Tauri invoke commands backed by local SQLite.
 * Otherwise, it falls back to the regular Next.js API (fetch).
 *
 * This allows the same codebase to run as:
 *   - Web app (Vercel)     → fetch to Next.js API routes
 *   - Desktop app (Tauri)  → invoke to Rust + SQLite
 */

// ── Detection ───────────────────────────────────────────────────

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// ── Tauri invoke wrapper ────────────────────────────────────────

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

// ── Utilities ───────────────────────────────────────────────────

export function isOnline(): Promise<boolean> {
  if (!isTauri()) return Promise.resolve(navigator.onLine);
  return invoke<boolean>("is_online");
}

export async function forcePushAll(apiUrl: string, token: string): Promise<string> {
  if (!isTauri()) throw new Error("Not available in web mode");
  return invoke<string>("force_push_all", { apiUrl, token });
}

export async function checkForUpdates(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<string | null>("check_update");
  } catch {
    return null;
  }
}

// ── Cliente ─────────────────────────────────────────────────────

function mapCliente(row: any) {
  return {
    id: row.id,
    apelido: row.apelido,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    ativo: row.ativo,
    rua: row.rua,
    numero: row.numero,
    bairro: row.bairro,
    complemento: row.complemento,
    cep: row.cep ?? null,
    municipio: row.municipio,
    uf: row.uf,
    telefone: row.telefone,
    email: row.email,
    criadoEm: row.criado_em,
  };
}

export async function listClientes(q?: string): Promise<any[]> {
  if (!isTauri()) {
    const res = await fetch(`/api/clientes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    return res.json();
  }
  const data = await invoke<any[]>("list_clientes", { q: q ?? null });
  return data.map(mapCliente);
}

export async function getCliente(id: number): Promise<any> {
  if (!isTauri()) {
    const res = await fetch(`/api/clientes/${id}`);
    return res.json();
  }
  return mapCliente(await invoke("get_cliente", { id }));
}

export async function saveCliente(input: any): Promise<any> {
  if (!isTauri()) {
    const res = await fetch("/api/clientes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  return mapCliente(await invoke("save_cliente", { cliente: input }));
}

export async function deleteCliente(id: number): Promise<void> {
  if (!isTauri()) {
    await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    return;
  }
  await invoke("delete_cliente", { id });
}

// ── Empreendimento ──────────────────────────────────────────────

function mapEmpreendimento(row: any) {
  return {
    id: row.id,
    apelido: row.apelido,
    ativo: row.ativo,
    cnpj: row.cnpj ?? null,
    cep: row.cep ?? null,
    municipio: row.municipio,
    uf: row.uf,
    rua: row.rua,
    numero: row.numero,
    bairro: row.bairro,
    complemento: row.complemento,
    descricao: row.descricao,
    clienteId: row.cliente_id,
  };
}

export async function listEmpreendimentos(q?: string, clienteId?: number): Promise<any[]> {
  if (!isTauri()) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (clienteId) params.set("clienteId", String(clienteId));
    const res = await fetch(`/api/empreendimentos?${params}`);
    return res.json();
  }
  const data = await invoke<any[]>("list_empreendimentos", { q: q ?? null, cliente_id: clienteId ?? null });
  return data.map(mapEmpreendimento);
}

export async function saveEmpreendimento(input: any): Promise<any> {
  if (!isTauri()) {
    const res = await fetch("/api/empreendimentos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  return mapEmpreendimento(await invoke("save_empreendimento", { emp: input }));
}

export async function deleteEmpreendimento(id: number): Promise<void> {
  if (!isTauri()) {
    await fetch(`/api/empreendimentos/${id}`, { method: "DELETE" });
    return;
  }
  await invoke("delete_empreendimento", { id });
}

// ── Processo ────────────────────────────────────────────────────

function mapProcesso(row: any) {
  return {
    id: row.id,
    tipo: row.tipo,
    ativo: row.ativo,
    orgaoId: row.orgao_id,
    sistema: row.sistema,
    numProtocolo: row.num_protocolo,
    status: row.status,
    validade: row.validade,
    empreendimentoId: row.empreendimento_id,
    responsavelId: row.responsavel_id,
    observacoes: row.observacoes,
    numLicenca: row.num_licenca,
  };
}

export async function listProcessos(empreendimentoId?: number): Promise<any[]> {
  if (!isTauri()) {
    const params = empreendimentoId ? `?empreendimentoId=${empreendimentoId}` : "";
    const res = await fetch(`/api/processos${params}`);
    return res.json();
  }
  const data = await invoke<any[]>("list_processos", { empreendimento_id: empreendimentoId ?? null });
  return data.map(mapProcesso);
}

export async function saveProcesso(input: any): Promise<any> {
  if (!isTauri()) {
    const res = await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  return mapProcesso(await invoke("save_processo", { processo: input }));
}

// ── Tarefa ──────────────────────────────────────────────────────

function mapTarefa(row: any) {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status: row.status,
    prioridade: row.prioridade,
    dataVencimento: row.data_vencimento,
    statusObs: row.status_obs,
    responsavelId: row.responsavel_id,
    usuarioId: row.usuario_id,
  };
}

export async function listTarefas(): Promise<any[]> {
  if (!isTauri()) {
    const res = await fetch("/api/tarefas");
    return res.json();
  }
  const data = await invoke<any[]>("list_tarefas");
  return data.map(mapTarefa);
}

export async function saveTarefa(input: any): Promise<any> {
  if (!isTauri()) {
    const res = await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  return mapTarefa(await invoke("save_tarefa", { tarefa: input }));
}

// ── Financeiro ──────────────────────────────────────────────────

function mapFinanceiro(row: any) {
  return {
    id: row.id,
    tipoCobranca: row.tipo_cobranca,
    valor: row.valor,
    formaPagamento: row.forma_pagamento,
    statusPagamento: row.status_pagamento,
    dataVencimento: row.data_vencimento,
    dataPagamento: row.data_pagamento,
    descricao: row.descricao,
    clienteId: row.cliente_id,
  };
}

export async function listFinanceiros(clienteId?: number): Promise<any[]> {
  if (!isTauri()) {
    const params = clienteId ? `?clienteId=${clienteId}` : "";
    const res = await fetch(`/api/financeiros${params}`);
    return res.json();
  }
  const data = await invoke<any[]>("list_financeiros", { cliente_id: clienteId ?? null });
  return data.map(mapFinanceiro);
}

export async function saveFinanceiro(input: any): Promise<any> {
  if (!isTauri()) {
    const res = await fetch("/api/financeiros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  return mapFinanceiro(await invoke("save_financeiro", { financeiro: input }));
}
