"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/components/Toast";

export type TppInicial = {
  id: number;
  numero: string;
  clienteId: number;
  empreendimentoId: number | null;
  dataEmissao: string;
  dataValidade: string;
  veiculos: string | null;
  classesRisco: string | null;
  observacoes: string | null;
  arquivoNome: string | null;
};

type Props = {
  modo: "novo" | "editar";
  tppId?: number;
  inicial?: TppInicial | null;
  renovarId?: number;
};

interface Cliente {
  id: number;
  apelido: string;
  cnpj: string | null;
}

interface Empreendimento {
  id: number;
  apelido: string;
  clienteId: number;
}

const VALIDADE_DIAS = 90;

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const m = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return String(value).slice(0, 10);
}

function somarDias(data: string, dias: number): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export default function TppForm({ modo, tppId, inicial, renovarId }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [form, setForm] = useState({
    numero: inicial?.numero || "",
    clienteId: inicial ? String(inicial.clienteId) : "",
    empreendimentoId: inicial?.empreendimentoId ? String(inicial.empreendimentoId) : "",
    dataEmissao: inicial ? String(inicial.dataEmissao).slice(0, 10) : "",
    dataValidade: inicial ? String(inicial.dataValidade).slice(0, 10) : "",
    veiculos: inicial?.veiculos || "",
    classesRisco: inicial?.classesRisco || "",
    observacoes: inicial?.observacoes || "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [removerArquivo, setRemoverArquivo] = useState(false);
  const arquivoAtual = inicial?.arquivoNome || null;
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedMsg, setExtractedMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const renovarDe = renovarId || null;

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data: Cliente[]) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/empreendimentos")
      .then((r) => r.json())
      .then((data: Empreendimento[]) => setEmpreendimentos(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!renovarDe) return;
    fetch(`/api/tpp/${renovarDe}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error || !data.clienteId) return;
        setForm((prev) => ({
          ...prev,
          clienteId: String(data.clienteId),
          empreendimentoId: data.empreendimentoId ? String(data.empreendimentoId) : "",
          veiculos: data.veiculos || "",
          classesRisco: data.classesRisco || "",
          observacoes: data.observacoes || "",
        }));
      })
      .catch(() => {});
  }, [renovarDe]);

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "dataEmissao" && value && !prev.dataValidade) {
        next.dataValidade = somarDias(value, VALIDADE_DIAS);
      }
      if (field === "clienteId") next.empreendimentoId = "";
      return next;
    });
  }

  function extrairCnpjDigitos(texto: string): string {
    return texto.replace(/\D/g, "");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setFile(arquivo);
    setExtracting(true);
    setUploadError(null);
    setExtractedMsg(null);
    setError("");

    try {
      const body = new FormData();
      body.append("file", arquivo);
      const res = await fetch("/api/tpp/extract", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || "Erro ao processar documento");
        return;
      }
      const data = await res.json();

      setForm((prev) => {
        const next = { ...prev };
        if (data.numero) next.numero = data.numero;
        if (data.emitidoEm) next.dataEmissao = toDateInput(data.emitidoEm);
        if (data.validoAte) next.dataValidade = toDateInput(data.validoAte);
        if (data.veiculos) next.veiculos = data.veiculos;
        if (data.classesRisco) next.classesRisco = data.classesRisco;
        if (data.cnpj && !next.clienteId) {
          const cnpj = extrairCnpjDigitos(data.cnpj);
          const cliente = clientes.find((c) => c.cnpj && extrairCnpjDigitos(c.cnpj) === cnpj);
          if (cliente) next.clienteId = String(cliente.id);
        }
        return next;
      });

      const campos = [data.numero, data.emitidoEm, data.validoAte, data.veiculos, data.classesRisco].filter(Boolean).length;
      setExtractedMsg(
        campos > 0
          ? `${arquivo.name} — ${campos} campo(s) extraído(s) do documento`
          : `${arquivo.name} — documento não reconhecido como TPP`
      );
    } catch {
      setUploadError("Erro ao processar documento");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.clienteId) {
      setError("Selecione um cliente.");
      return;
    }
    if (!form.numero.trim()) {
      setError("Informe o nº de registro da autorização.");
      return;
    }
    if (!form.dataEmissao || !form.dataValidade) {
      setError("Informe a data de emissão e a validade.");
      return;
    }
    if (form.dataValidade <= form.dataEmissao) {
      setError("A validade deve ser posterior à emissão.");
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.append("numero", form.numero.trim());
      body.append("clienteId", form.clienteId);
      body.append("empreendimentoId", form.empreendimentoId);
      body.append("dataEmissao", form.dataEmissao);
      body.append("dataValidade", form.dataValidade);
      body.append("veiculos", form.veiculos.trim());
      body.append("classesRisco", form.classesRisco.trim());
      body.append("observacoes", form.observacoes.trim());
      if (file) body.append("arquivo", file);
      if (modo === "editar" && removerArquivo && !file) body.append("removerArquivo", "1");

      const url = modo === "editar" ? `/api/tpp/${tppId}` : "/api/tpp";
      const res = await fetch(url, {
        method: modo === "editar" ? "PUT" : "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Erro ao salvar autorização.");
        return;
      }

      toast(modo === "editar" ? "Autorização atualizada" : "Autorização cadastrada", "success");
      router.push(`/tpp/${data.id}`);
      router.refresh();
    } catch {
      setError("Erro ao salvar autorização.");
    } finally {
      setSaving(false);
    }
  }

  const empreendimentosDoCliente = form.clienteId
    ? empreendimentos.filter((e) => e.clienteId === Number(form.clienteId))
    : [];

  return (
    <form onSubmit={handleSubmit} className="shadow-card mx-auto max-w-3xl space-y-5 rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      {renovarDe && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-brand-50)] px-3 py-2 text-sm text-[var(--color-brand-700)]">
          <RefreshCw size={16} />
          Renovação: cliente, empreendimento, veículos e classes copiados da autorização anterior. Informe os dados do novo PDF ou faça o upload.
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4">
        <h2 className="font-display text-sm font-semibold text-[var(--color-ink-900)]">Upload da Autorização</h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
          Anexe o documento da autorização (PDF ou imagem) para preenchimento automático do nº do IBAMA, datas, placas dos veículos e classes de risco.
        </p>

        <label className="focus-ring transition-brand mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-paper-200)] px-4 py-6 text-sm text-[var(--color-ink-500)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)]">
          {extracting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processando documento...
            </>
          ) : extractedMsg ? (
            <>
              <CheckCircle2 size={18} className="text-green-600" />
              <span className="text-green-700">{extractedMsg}</span>
            </>
          ) : (
            <>
              <Upload size={18} />
              <span>Clique para selecionar o arquivo da autorização</span>
            </>
          )}
          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" disabled={extracting} />
        </label>

        {uploadError && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{uploadError}</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Cliente *</label>
          <select
            value={form.clienteId}
            onChange={(e) => setField("clienteId", e.target.value)}
            className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.apelido}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Empreendimento</label>
          <select
            value={form.empreendimentoId}
            onChange={(e) => setField("empreendimentoId", e.target.value)}
            className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          >
            <option value="">Selecione...</option>
            {empreendimentosDoCliente.map((e) => (
              <option key={e.id} value={e.id}>{e.apelido}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Nº de registro (IBAMA) *</label>
          <input
            value={form.numero}
            onChange={(e) => setField("numero", e.target.value)}
            placeholder="Ex.: 8391530"
            className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Emitido em *</label>
          <input
            type="date"
            value={form.dataEmissao}
            onChange={(e) => setField("dataEmissao", e.target.value)}
            className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Válido até *</label>
          <input
            type="date"
            value={form.dataValidade}
            onChange={(e) => setField("dataValidade", e.target.value)}
            className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>
      </div>
      <p className="text-xs text-[var(--color-ink-500)]">
        Validade padrão de {VALIDADE_DIAS} dias após a emissão (preenchida automaticamente se o campo de validade estiver vazio).
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Veículos (placa — tipo)</label>
        <textarea
          value={form.veiculos}
          onChange={(e) => setField("veiculos", e.target.value)}
          rows={4}
          placeholder={"ATF2117 — Caminhão\nAXK6H52 — Caminhão"}
          className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Classes de risco</label>
        <textarea
          value={form.classesRisco}
          onChange={(e) => setField("classesRisco", e.target.value)}
          rows={2}
          placeholder={"Classe 1 — Explosivos\nClasse 9 — Substâncias e Artigos Perigosos Diversos"}
          className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">Observações</label>
        <textarea
          value={form.observacoes}
          onChange={(e) => setField("observacoes", e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
        />
      </div>

      {modo === "editar" && arquivoAtual && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--color-paper-100)] px-3 py-2 text-sm">
          <FileText size={16} className="text-[var(--color-ink-500)]" />
          <span className="text-[var(--color-ink-700)]">{arquivoAtual}</span>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
            <input
              type="checkbox"
              checked={removerArquivo}
              onChange={(e) => setRemoverArquivo(e.target.checked)}
            />
            Remover arquivo atual
          </label>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || extracting}
          className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Upload size={16} /> {modo === "editar" ? "Salvar alterações" : "Cadastrar autorização"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}