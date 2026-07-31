"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Loader2, Save, ArrowLeft, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "textarea" | "date" | "number" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  search?: "cep" | "cnpj" | "sia";
  validate?: (value: string | boolean) => string | null;
}

interface EditEntityFormProps {
  entity: string;
  entityName: string;
  endpoint: string;
  redirectTo: string;
  fields: FieldConfig[];
  data: Record<string, unknown>;
  method?: "POST" | "PUT";
}

export default function EditEntityForm({
  entity,
  entityName,
  endpoint,
  redirectTo,
  fields,
  data,
  method = "PUT",
}: EditEntityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {};
    for (const f of fields) {
      const val = data[f.name];
      if (f.type === "checkbox") {
        initial[f.name] = Boolean(val);
      } else if (f.type === "date" && val) {
        const d = new Date(val as string);
        initial[f.name] = d.toISOString().split("T")[0];
      } else {
        initial[f.name] = val != null ? String(val) : "";
      }
    }
    return initial;
  });

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};
    for (const f of fields) {
      const val = form[f.name];
      if (f.required && (!val || (typeof val === "string" && !val.trim()))) {
        errors[f.name] = `${f.label} é obrigatório`;
        continue;
      }
      if (f.validate && typeof val === "string") {
        const msg = f.validate(val);
        if (msg) errors[f.name] = msg;
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fields, form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        let val: unknown = form[f.name];
        if (f.type === "checkbox") val = Boolean(val);
        else if (f.type === "number") val = Number(val);
        else if (f.type === "date" && val) val = new Date(val as string).toISOString();
        else if (val === "" && !f.required) val = null;
        body[f.name] = val;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Erro ao atualizar ${entityName}`);
        return;
      }

      toast(`${entityName} atualizado(a) com sucesso`, "success");
      setDirty(false);
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(`Erro ao atualizar ${entityName}`);
    } finally {
      setSaving(false);
    }
  }

  function formatCNPJ(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function setField(name: string, value: string | boolean) {
    const field = fields.find((f) => f.name === name);
    const masked = field?.search === "cnpj" && typeof value === "string" ? formatCNPJ(value) : value;
    setForm((prev) => ({ ...prev, [name]: masked }));
    setDirty(true);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  const CEP_MAP: Record<string, string> = { rua: "rua", bairro: "bairro", municipio: "municipio", uf: "uf", complemento: "complemento" };
  const CNPJ_MAP: Record<string, string> = {
    razaoSocial: "razaoSocial", nomeFantasia: "nomeFantasia", ramoAtividade: "ramoAtividade",
    enderecoRua: "rua", enderecoNumero: "numero", enderecoComplemento: "complemento",
    bairro: "bairro", cep: "cep", municipio: "municipio", uf: "uf", telefone: "telefone", email: "email",
  };

  function toDateInput(value: string): string {
    const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  }

  async function handleSearch(field: FieldConfig) {
    const raw = form[field.name];
    if (!raw || typeof raw !== "string") return;
    const clean = raw.replace(/\D/g, "");
    if (field.search === "cep" && clean.length !== 8) return toast("CEP inválido (8 dígitos)", "error");
    if (field.search === "cnpj" && clean.length !== 14) return toast("CNPJ inválido (14 dígitos)", "error");
    try {
      if (field.search === "sia") {
        if (!clean) return toast("Informe o nº do protocolo", "error");
        const res = await fetch(`/api/sia/consulta?protocolo=${clean}`);
        if (!res.ok) return toast("Licença não encontrada no SIA/IAP", "error");
        const d = await res.json();
        setForm((prev) => {
          const next = { ...prev };
          if (d.protocolo && "numProtocolo" in next) next.numProtocolo = d.protocolo;
          if (d.numLicenca && "numLicenca" in next) next.numLicenca = d.numLicenca;
          if (d.dataValidade && "validade" in next) next.validade = toDateInput(d.dataValidade);
          if (d.dataEmissao && "dataProtocolo" in next) next.dataProtocolo = toDateInput(d.dataEmissao);
          if (d.condicionantes && "condicionantes" in next) next.condicionantes = d.condicionantes;
          return next;
        });
        setDirty(true);
        toast("Dados do SIA/IAP preenchidos", "success");
        return;
      }
      const res = await fetch(`/api/${field.search}/${clean}`);
      if (!res.ok) return toast("Não encontrado", "error");
      const d = await res.json();
      const map = field.search === "cep" ? CEP_MAP : CNPJ_MAP;
      setForm((prev) => {
        const next = { ...prev };
        for (const [apiKey, formKey] of Object.entries(map)) {
          if (d[apiKey] && formKey in next) next[formKey] = d[apiKey];
        }
        return next;
      });
      setDirty(true);
    } catch {
      toast("Erro ao consultar.", "error");
    }
  }

  return (
    <div>
      <Topbar
        title={method === "POST" ? `Novo ${entityName}` : `Editar ${entityName}`}
        actions={
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        }
      />
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.name])}
                      onChange={(e) => setField(f.name, e.target.checked)}
                      className="accent-[var(--color-brand-500)] w-4 h-4"
                    />
                    <span className="text-sm text-[var(--color-ink-500)]">{form[f.name] ? "Sim" : "Não"}</span>
                  </label>
                ) : f.type === "select" ? (
                  <select
                    value={form[f.name] as string || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${fieldErrors[f.name] ? "border-red-400" : "border-[var(--color-paper-200)]"}`}
                    required={f.required}
                  >
                    <option value="">Selecione...</option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={form[f.name] as string || ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    rows={5}
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${fieldErrors[f.name] ? "border-red-400" : "border-[var(--color-paper-200)]"}`}
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                      value={form[f.name] as string || ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] ${fieldErrors[f.name] ? "border-red-400" : "border-[var(--color-paper-200)]"}`}
                      required={f.required}
                    />
                    {f.search && (
                      <button
                        type="button"
                        onClick={() => handleSearch(f)}
                        className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] whitespace-nowrap"
                      >
                        <Search size={14} />
                        Buscar
                      </button>
                    )}
                  </div>
                )}
                {fieldErrors[f.name] && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle size={12} />
                    {fieldErrors[f.name]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-[var(--color-paper-200)]">
            <button
              type="submit"
              disabled={saving}
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
            onClick={() => router.back()}
              className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
