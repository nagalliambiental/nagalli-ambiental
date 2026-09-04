"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Mail, Loader2, X, ChevronLeft, Search, Users, MapPin, Settings2 } from "lucide-react";
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

interface ContatoTemp {
  key: number;
  nome: string;
  assunto: string;
  email: string;
  telefone: string;
}

let contatoKeySeq = 0;

export default function NovoClientePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [carregandoCliente, setCarregandoCliente] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cnpjDuplicado, setCnpjDuplicado] = useState(false);

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

  const [contatos, setContatos] = useState<ContatoTemp[]>([]);
  const [salvandoContatoIdx, setSalvandoContatoIdx] = useState<number | null>(null);

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
    if (cnpj.length !== 14) return toast("Informe um CNPJ valido (14 digitos)", "warning");
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`);
      if (!res.ok) return toast("CNPJ nao encontrado", "error");
      const d = await res.json();
      setForm((prev) => {
        const next = { ...prev };
        for (const [apiKey, formKey] of Object.entries(CNPJ_MAP)) {
          if (d[apiKey]) (next as Record<string, unknown>)[formKey] = d[apiKey];
        }
        if (typeof d.cep === "string") (next as ClienteFormData).cep = d.cep.replace(/\D/g, "");
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
    if (cep.length !== 8) return toast("Informe um CEP valido (8 digitos)", "warning");
    setBuscandoCep(true);
    try {
      const res = await fetch(`/api/cep/${cep}`);
      if (!res.ok) return toast("CEP nao encontrado", "error");
      const d = await res.json();
      setForm((prev) => {
        const next = { ...prev };
        for (const [apiKey, formKey] of Object.entries(CEP_MAP)) {
          if (d[apiKey]) (next as Record<string, unknown>)[formKey] = d[apiKey];
        }
        return next;
      });
      toast("Endereco preenchido pelo CEP", "success");
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
      toast("Este CNPJ ja esta cadastrado para outro cliente.", "error");
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
      const novoId = data.id as number;

      const contatosPendentes = contatos.filter((c) => c.nome.trim());
      if (contatosPendentes.length > 0) {
        const resultados = await Promise.allSettled(
          contatosPendentes.map((c) =>
            fetch("/api/contatos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nome: c.nome.trim(),
                assunto: c.assunto.trim() || null,
                email: c.email.trim() || null,
                telefone: c.telefone.trim() || null,
                clienteId: novoId,
              }),
            }).then((r) => r.json())
          )
        );
        const erros = resultados.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && r.value?.error));
        if (erros.length > 0) {
          toast(`Cliente salvo, mas ${erros.length} contato(s) falharam ao salvar.`, "warning");
        } else if (contatosPendentes.length > 0) {
          toast(`${contatosPendentes.length} contato(s) salvo(s) com sucesso`, "success");
        }
      } else {
        toast("Cliente cadastrado com sucesso", "success");
      }

      setClienteId(novoId);
      setContatos([]);
    } catch {
      toast("Falha ao salvar cliente", "error");
    } finally {
      setCarregandoCliente(false);
    }
  }

  function adicionarContatoLinha() {
    setContatos((prev) => [...prev, { key: ++contatoKeySeq, nome: "", assunto: "", email: "", telefone: "" }]);
  }

  function removerContatoLinha(key: number) {
    setContatos((prev) => prev.filter((c) => c.key !== key));
  }

  function atualizarContatoLinha(key: number, campo: keyof ContatoTemp, valor: string) {
    setContatos((prev) => prev.map((c) => (c.key === key ? { ...c, [campo]: valor } : c)));
  }

  async function salvarContato(idx: number) {
    const c = contatos[idx];
    if (!c.nome.trim()) {
      toast("Nome do contato e obrigatorio", "error");
      return;
    }
    if (!clienteId) {
      const contatosAtuais = [...contatos];
      toast("Contato sera salvo junto com o cliente", "info");
      return;
    }
    setSalvandoContatoIdx(idx);
    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: c.nome.trim(),
          assunto: c.assunto.trim() || null,
          email: c.email.trim() || null,
          telefone: c.telefone.trim() || null,
          clienteId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao salvar contato", "error");
        return;
      }
      toast("Contato salvo", "success");
      setContatos((prev) => prev.filter((_, i) => i !== idx));
    } catch {
      toast("Falha ao salvar contato", "error");
    } finally {
      setSalvandoContatoIdx(null);
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

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6">
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Dados do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 lg:col-span-3 border-b border-[var(--color-paper-200)] pb-2 pt-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)]">
              <Building2 size={15} />
              Dados da Empresa
            </h3>
          </div>
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
            <label className={labelCls}>Razao Social *</label>
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
              <p className="mt-1 block text-xs text-red-600">Este CNPJ ja esta cadastrado para outro cliente.</p>
            )}
          </div>

          <div className="md:col-span-2 lg:col-span-3 border-b border-[var(--color-paper-200)] pb-2 pt-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)]">
              <Mail size={15} />
              Contato da Empresa
            </h3>
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls}
              type="email"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 border-b border-[var(--color-paper-200)] pb-2 pt-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)]">
              <MapPin size={15} />
              Endereco
            </h3>
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
                title="Buscar endereco pelo CEP (ViaCEP)"
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
            <label className={labelCls}>Numero</label>
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
            <label className={labelCls}>Municipio</label>
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

          <div className="md:col-span-2 lg:col-span-3 border-b border-[var(--color-paper-200)] pb-2 pt-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)]">
              <Users size={15} />
              Responsaveis
            </h3>
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
            <label className={labelCls}>Resp. Tecnico</label>
            <input
              value={form.responsavelTecnicoNome}
              onChange={(e) => setForm((f) => ({ ...f, responsavelTecnicoNome: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Conselho do Resp. Tecnico</label>
            <input
              value={form.responsavelTecnicoConselho}
              onChange={(e) => setForm((f) => ({ ...f, responsavelTecnicoConselho: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>CPF do Resp. Tecnico</label>
            <input
              value={form.responsavelTecnicoCpf}
              onChange={(e) => setForm((f) => ({ ...f, responsavelTecnicoCpf: e.target.value.replace(/\D/g, "") }))}
              className={inputCls}
              placeholder="000.000.000-00"
              maxLength={11}
            />
          </div>
          <div>
            <label className={labelCls}>Resp. implantacao PGRS</label>
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

          <div className="md:col-span-2 lg:col-span-3 border-b border-[var(--color-paper-200)] pb-2 pt-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)]">
              <Settings2 size={15} />
              Complemento e Configuracao
            </h3>
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
              <option value="publico">Publico</option>
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

        <div className="md:col-span-2 lg:col-span-3 border-b border-[var(--color-paper-200)] pb-2 pt-6 mt-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-600)]">
            <Users size={15} />
            Contatos
          </h3>
          <p className="text-xs text-[var(--color-ink-500)] mt-1">
            Cadastre os contatos deste cliente. Eles serao usados nos MTRs dos empreendimentos.
          </p>
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-end mb-3">
            <button
              type="button"
              onClick={adicionarContatoLinha}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={15} />
              Adicionar contato
            </button>
          </div>

          {contatos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-[var(--color-ink-400)]">
              <Users size={24} />
              <p className="text-sm">Nenhum contato adicionado.</p>
              <p className="text-xs">Clique em &quot;Adicionar contato&quot; para comecar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contatos.map((c, idx) => (
                <div key={c.key} className="flex items-end gap-2 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Nome *</label>
                    <input
                      placeholder="Nome do contato"
                      value={c.nome}
                      onChange={(e) => atualizarContatoLinha(c.key, "nome", e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Assunto</label>
                    <input
                      placeholder="Assunto / Setor"
                      value={c.assunto}
                      onChange={(e) => atualizarContatoLinha(c.key, "assunto", e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Email</label>
                    <input
                      placeholder="email@exemplo.com"
                      type="email"
                      value={c.email}
                      onChange={(e) => atualizarContatoLinha(c.key, "email", e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Telefone</label>
                    <input
                      placeholder="(00) 00000-0000"
                      value={c.telefone}
                      onChange={(e) => atualizarContatoLinha(c.key, "telefone", e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-1 shrink-0 pb-0.5">
                    <button
                      type="button"
                      onClick={() => removerContatoLinha(c.key)}
                      title="Remover linha"
                      className="rounded-lg p-2 text-[var(--color-ink-500)] hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  );
}
