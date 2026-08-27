"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Mail, Loader2, X, ChevronLeft, Search } from "lucide-react";
import { useToast } from "@/components/Toast";

interface ClienteFormData {
  apelido: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cep: string;
  municipio: string;
  uf: string;
  respLegal: string;
  responsavelTecnicoNome: string;
  responsavelTecnicoConselho: string;
  responsavelTecnicoCpf: string;
  responsavelPgrsNome: string;
  responsavelPgrsCargo: string;
  ramoAtividade: string;
  visibilidade: string;
  ativo: boolean;
}

interface EmpreendimentoOpcao {
  id: number;
  apelido: string;
  unidadeSinir?: string | null;
  cliente?: { apelido: string } | null;
}

interface ContatoEmpreendimento {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
  telefone: string | null;
  empreendimentoId: number | null;
  ativo: boolean;
  criadoEm: string;
}

export default function NovoClientePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [aba, setAba] = useState<"cliente" | "contatos">("cliente");
  const [carregandoCliente, setCarregandoCliente] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoOpcao[]>([]);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cnpjDuplicado, setCnpjDuplicado] = useState(false);

  // Cliente form state
  const [form, setForm] = useState<ClienteFormData>({
    apelido: "",
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    telefone: "",
    email: "",
    rua: "",
    numero: "",
    bairro: "",
    complemento: "",
    cep: "",
    municipio: "",
    uf: "",
    respLegal: "",
    responsavelTecnicoNome: "",
    responsavelTecnicoConselho: "",
    responsavelTecnicoCpf: "",
    responsavelPgrsNome: "",
    responsavelPgrsCargo: "",
    ramoAtividade: "",
    visibilidade: "publico",
    ativo: true,
  });

  // Contatos state
  const [empreendimentoIdContato, setEmpreendimentoIdContato] = useState("");
  const [contatos, setContatos] = useState<ContatoEmpreendimento[]>([]);
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [formContato, setFormContato] = useState({ nome: "", email: "", cargo: "", telefone: "" });

  const CNPJ_MAP: Record<string, keyof ClienteFormData> = {
    razaoSocial: "razaoSocial",
    nomeFantasia: "nomeFantasia",
    ramoAtividade: "ramoAtividade",
    enderecoRua: "rua",
    enderecoNumero: "numero",
    enderecoComplemento: "complemento",
    bairro: "bairro",
    cep: "cep",
    municipio: "municipio",
    uf: "uf",
    telefone: "telefone",
    email: "email",
  };

  const CEP_MAP: Record<string, keyof ClienteFormData> = {
    rua: "rua",
    bairro: "bairro",
    municipio: "municipio",
    uf: "uf",
    complemento: "complemento",
  };

  async function buscarCNPJ() {
    const cnpj = form.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return toast("Informe um CNPJ válido (14 dígitos)", "warning");
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`);
      if (!res.ok) return toast("CNPJ não encontrado", "error");
      const d = await res.json();
      setForm((prev) => {
        const next = { ...prev };
        for (const [apiKey, formKey] of Object.entries(CNPJ_MAP)) {
          if (d[apiKey]) (next as Record<string, unknown>)[formKey] = d[apiKey];
        }
        return next;
      });
      toast("Dados do CNPJ preenchidos automaticamente", "success");
    } catch {
      toast("Erro ao consultar CNPJ", "error");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function buscarCEP() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return toast("Informe um CEP válido (8 dígitos)", "warning");
    setBuscandoCep(true);
    try {
      const res = await fetch(`/api/cep/${cep}`);
      if (!res.ok) return toast("CEP não encontrado", "error");
      const d = await res.json();
      setForm((prev) => {
        const next = { ...prev };
        for (const [apiKey, formKey] of Object.entries(CEP_MAP)) {
          if (d[apiKey]) (next as Record<string, unknown>)[formKey] = d[apiKey];
        }
        return next;
      });
      toast("Endereço preenchido pelo CEP", "success");
    } catch {
      toast("Erro ao consultar CEP", "error");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function verificarCnpjDuplicado() {
    const cnpj = form.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      setCnpjDuplicado(false);
      return;
    }
    try {
      const res = await fetch(`/api/clientes/verificar-cnpj?cnpj=${encodeURIComponent(cnpj)}`);
      if (res.ok) {
        const d = (await res.json()) as { existe: boolean };
        setCnpjDuplicado(d.existe);
      }
    } catch {
      setCnpjDuplicado(false);
    }
  }

  async function salvarCliente() {
    if (cnpjDuplicado) {
      toast("Este CNPJ já está cadastrado para outro cliente.", "error");
      return;
    }
    setCarregandoCliente(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.erro || data?.error || "Falha ao salvar cliente", "error");
        return;
      }
      toast("Cliente cadastrado com sucesso", "success");
      setClienteId(data.id);
      setAba("contatos");
      await carregarEmpreendimentos();
    } catch {
      toast("Falha ao salvar cliente", "error");
    } finally {
      setCarregandoCliente(false);
    }
  }

  interface EmpreendimentoApi {
    id: number;
    apelido: string;
    unidadeSinir?: string | null;
  }

  async function carregarEmpreendimentos() {
    if (!clienteId) return;
    try {
      const res = await fetch(`/api/empreendimentos?clienteId=${clienteId}`);
      if (res.ok) {
        const data: EmpreendimentoApi[] = await res.json();
        setEmpreendimentos(data.map((e) => ({
          id: e.id,
          apelido: e.apelido,
          unidadeSinir: e.unidadeSinir,
          cliente: { apelido: "" },
        })));
      }
    } catch {
      // silencioso
    }
  }

  async function carregarContatos() {
    if (!empreendimentoIdContato) {
      setContatos([]);
      return;
    }
    setCarregandoContatos(true);
    try {
      const res = await fetch(`/api/contatos?empreendimentoId=${empreendimentoIdContato}`);
      if (res.ok) setContatos(await res.json());
      else toast("Falha ao carregar os contatos", "error");
    } catch {
      toast("Falha ao carregar os contatos", "error");
    } finally {
      setCarregandoContatos(false);
    }
  }

  async function adicionarContato() {
    if (!formContato.nome.trim() || !formContato.email.trim()) {
      toast("Informe nome e e-mail do contato", "error");
      return;
    }
    setSalvandoContato(true);
    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formContato,
          empreendimentoId: empreendimentoIdContato ? Number(empreendimentoIdContato) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao salvar o contato", "error");
        return;
      }
      toast("Contato cadastrado", "success");
      setFormContato({ nome: "", email: "", cargo: "", telefone: "" });
      carregarContatos();
    } catch {
      toast("Falha ao salvar o contato", "error");
    } finally {
      setSalvandoContato(false);
    }
  }

  async function excluirContato(c: ContatoEmpreendimento) {
    if (!confirm(`Remover o contato ${c.nome} (${c.email})?`)) return;
    try {
      const res = await fetch(`/api/contatos/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao remover o contato", "error");
        return;
      }
      toast("Contato removido", "success");
      carregarContatos();
    } catch {
      toast("Falha ao remover o contato", "error");
    }
  }

  const inputCls = "w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
  const labelCls = "mb-1 block text-xs font-medium text-[var(--color-ink-500)]";

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]"
        >
          <ChevronLeft size={16} />
          Voltar para clientes
        </button>
      </div>

      <div className="border-b border-[var(--color-paper-200)] mb-6">
        <nav className="flex gap-1" aria-label="Abas de cadastro">
          <button
            onClick={() => setAba("cliente")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-card)] transition-colors ${
              aba === "cliente"
                ? "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"
            }`}
          >
            <Building2 size={16} />
            Dados do Cliente
          </button>
          <button
            onClick={() => setAba("contatos")}
            disabled={!clienteId}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-card)] transition-colors ${
              aba === "contatos"
                ? "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"
            } opacity-${clienteId ? "100" : "50"}`}
          >
            <Mail size={16} />
            Contatos
          </button>
        </nav>
      </div>

      {aba === "cliente" && (
        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Dados do Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Apelido *</label>
                <input
                  value={form.apelido}
                  onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Razão Social *</label>
                <input
                  value={form.razaoSocial}
                  onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Nome Fantasia</label>
                <input
                  value={form.nomeFantasia}
                  onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>CNPJ *</label>
                <div className="flex gap-2">
                  <input
                    value={form.cnpj}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");
                      setForm((f) => ({ ...f, cnpj: valor }));
                      setCnpjDuplicado(false);
                      if (valor.length === 14) void verificarCnpjDuplicado();
                    }}
                    className={inputCls}
                    placeholder="00000000000000"
                    maxLength={14}
                    required
                  />
                  <button
                    type="button"
                    onClick={buscarCNPJ}
                    disabled={buscandoCnpj}
                    className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                    title="Buscar dados pelo CNPJ (Receita Federal)"
                  >
                    {buscandoCnpj ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
                {cnpjDuplicado && (
                  <p className="mt-1 block text-xs text-red-600">Este CNPJ já está cadastrado para outro cliente.</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Telefone *</label>
                <input
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                  type="email"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>CEP</label>
                <div className="flex gap-2">
                  <input
                    value={form.cep}
                    onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value.replace(/\D/g, "") }))}
                    className={inputCls}
                    placeholder="00000-000"
                    maxLength={8}
                  />
                  <button
                    type="button"
                    onClick={buscarCEP}
                    disabled={buscandoCep}
                    className="focus-ring transition-brand flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                    title="Buscar endereço pelo CEP (ViaCEP)"
                  >
                    {buscandoCep ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Rua</label>
                <input
                  value={form.rua}
                  onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Número</label>
                <input
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Bairro</label>
                <input
                  value={form.bairro}
                  onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Complemento</label>
                <input
                  value={form.complemento}
                  onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Município</label>
                <input
                  value={form.municipio}
                  onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>UF</label>
                <input
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
                  className={inputCls}
                  maxLength={2}
                />
              </div>
              <div>
                <label className={labelCls}>Resp. Legal *</label>
                <input
                  value={form.respLegal}
                  onChange={(e) => setForm((f) => ({ ...f, respLegal: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Resp. Técnico</label>
                <input
                  value={form.responsavelTecnicoNome}
                  onChange={(e) => setForm((f) => ({ ...f, responsavelTecnicoNome: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Conselho do Resp. Técnico</label>
                <input
                  value={form.responsavelTecnicoConselho}
                  onChange={(e) => setForm((f) => ({ ...f, responsavelTecnicoConselho: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>CPF do Resp. Técnico</label>
                <input
                  value={form.responsavelTecnicoCpf}
                  onChange={(e) => setForm((f) => ({ ...f, responsavelTecnicoCpf: e.target.value.replace(/\D/g, "") }))}
                  className={inputCls}
                  placeholder="000.000.000-00"
                  maxLength={11}
                />
              </div>
              <div>
                <label className={labelCls}>Resp. implantação PGRS</label>
                <input
                  value={form.responsavelPgrsNome}
                  onChange={(e) => setForm((f) => ({ ...f, responsavelPgrsNome: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Cargo resp. PGRS</label>
                <input
                  value={form.responsavelPgrsCargo}
                  onChange={(e) => setForm((f) => ({ ...f, responsavelPgrsCargo: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Ramo de atividade</label>
                <input
                  value={form.ramoAtividade}
                  onChange={(e) => setForm((f) => ({ ...f, ramoAtividade: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Visibilidade</label>
                <select value={form.visibilidade} onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))} className={inputCls}>
                  <option value="publico">Público</option>
                  <option value="privado">Privado</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="rounded border-[var(--color-paper-200)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]"
                />
                <label htmlFor="ativo" className="text-sm text-[var(--color-ink-700)] cursor-pointer">Ativo</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => router.back()}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                onClick={salvarCliente}
                disabled={carregandoCliente}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
              >
                {carregandoCliente ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {carregandoCliente ? "Salvando..." : "Salvar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aba === "contatos" && (
        <div className="space-y-4">
          {!clienteId ? (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6 text-center">
              <Building2 size={32} className="mx-auto text-[var(--color-ink-400)]" />
              <p className="mt-2 text-[var(--color-ink-500)]">Salve o cliente primeiro para adicionar contatos.</p>
            </div>
          ) : empreendimentos.length === 0 ? (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6 text-center">
              <Building2 size={32} className="mx-auto text-[var(--color-ink-400)]" />
              <p className="mt-2 text-[var(--color-ink-500)]">Nenhum empreendimento cadastrado para este cliente.</p>
              <p className="mt-1 text-xs text-[var(--color-ink-400)]">Adicione um empreendimento para começar a cadastrar contatos.</p>
            </div>
          ) : (
            <>
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <div className="flex items-center gap-2 text-[var(--color-brand-600)] mb-2">
                  <Building2 size={20} />
                  <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Contatos por empreendimento</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                  Cadastre pessoas específicas de cada empreendimento para receber notificações de MTRs pendentes.
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Empreendimento</label>
                    <select
                      value={empreendimentoIdContato}
                      onChange={(e) => setEmpreendimentoIdContato(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
                    >
                      <option value="">Selecione um empreendimento...</option>
                      {empreendimentos.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.apelido}{e.unidadeSinir ? ` · unid. ${e.unidadeSinir}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {empreendimentoIdContato && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-5">
                    <input
                      placeholder="Nome *"
                      value={formContato.nome}
                      onChange={(e) => setFormContato((f) => ({ ...f, nome: e.target.value }))}
                      className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
                    />
                    <input
                      placeholder="E-mail *"
                      type="email"
                      value={formContato.email}
                      onChange={(e) => setFormContato((f) => ({ ...f, email: e.target.value }))}
                      className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
                    />
                    <input
                      placeholder="Cargo"
                      value={formContato.cargo}
                      onChange={(e) => setFormContato((f) => ({ ...f, cargo: e.target.value }))}
                      className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
                    />
                    <input
                      placeholder="Telefone"
                      value={formContato.telefone}
                      onChange={(e) => setFormContato((f) => ({ ...f, telefone: e.target.value }))}
                      className="rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
                    />
                    <button
                      onClick={adicionarContato}
                      disabled={salvandoContato}
                      className="focus-ring transition-brand flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                    >
                      {salvandoContato ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      Adicionar
                    </button>
                  </div>
                )}
              </div>

              {empreendimentoIdContato && (
                <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-paper-50)]">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Nome</th>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Cargo</th>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">E-mail</th>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Telefone</th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-500)]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carregandoContatos ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-ink-500)]">
                            <Loader2 size={16} className="mr-2 inline animate-spin" /> Carregando...
                          </td>
                        </tr>
                      ) : contatos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-ink-500)]">
                            Nenhum contato cadastrado para este empreendimento.
                          </td>
                        </tr>
                      ) : (
                        contatos.map((c) => (
                          <tr key={c.id} className="border-t border-[var(--color-paper-100)]">
                            <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{c.nome}</td>
                            <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.cargo || "—"}</td>
                            <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.email}</td>
                            <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.telefone || "—"}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => excluirContato(c)}
                                title="Remover contato"
                                className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-red-50 hover:text-red-700"
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}