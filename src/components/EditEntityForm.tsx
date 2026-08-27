"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { SectionCard } from "@/components/ui/SectionCard";
import { Loader2, Save, ArrowLeft, Search, AlertCircle, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useSession } from "next-auth/react";
import { ehPrivilegiado } from "@/lib/perfil";

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "textarea" | "date" | "number" | "checkbox";
  required?: boolean;
  adminOnly?: boolean;
  options?: { value: string; label: string }[];
  optionsUrl?: string;
  optionLabelKey?: string;
  search?: "cep" | "cnpj" | "sia";
  upload?: boolean;
  step?: string;
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
  icon?: LucideIcon;
}

export default function EditEntityForm({
  entityName,
  endpoint,
  redirectTo,
  fields,
  data,
  method = "PUT",
  icon: Icon = FileText,
}: EditEntityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const perfil = (session?.user as Record<string, unknown>)?.perfil as string;
  const privilegiado = ehPrivilegiado(perfil);
  const camposVisiveis = fields.filter((f) => !f.adminOnly || privilegiado);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [opcoesDinamicas, setOpcoesDinamicas] = useState<Record<string, { value: string; label: string }[]>>({});
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

  useEffect(() => {
    for (const f of fields) {
      if (!f.optionsUrl || f.options) continue;
      fetch(f.optionsUrl)
        .then((r) => r.json())
        .then((itens: Record<string, unknown>[]) => {
          const chave = f.optionLabelKey || "apelido";
          setOpcoesDinamicas((prev) => ({
            ...prev,
            [f.name]: (itens || []).map((i) => ({
              value: String(i.id),
              label: String(i[chave] ?? i.nome ?? i.apelido ?? i.id),
            })),
          }));
        })
        .catch(() => {});
    }
  }, [fields]);

  const validate = useCallback(() => {
    const errors: Record<string, string> = {};
    for (const f of camposVisiveis) {
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
  }, [camposVisiveis, form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {};
      for (const f of camposVisiveis) {
        let val: unknown = form[f.name];
        if (f.type === "checkbox") val = Boolean(val);
        else if (f.type === "number") val = val === "" || val == null ? null : Number(val);
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
        setError(err.erro || err.error || `Erro ao atualizar ${entityName}`);
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

        const preencher = (d: Record<string, unknown>, origem: string) => {
          setForm((prev) => {
            const next = { ...prev };
            if (origem === "sigarh") {
              if (d.portaria && "numProtocolo" in next) next.numProtocolo = String(d.portaria);
              if (d.portaria && "numLicenca" in next) next.numLicenca = String(d.portaria);
              if (d.dataVencimento && "validade" in next)
                next.validade = toDateInput(String(d.dataVencimento).split(" ")[0]);
              if (d.dataPublicacao && "dataProtocolo" in next)
                next.dataProtocolo = toDateInput(String(d.dataPublicacao));
              if (d.usuario && "observacoes" in next)
                next.observacoes = [String(next.observacoes || ""), `SIGARH: ${d.usuario}`].filter(Boolean).join("\n");
            } else if (origem === "ima") {
              if (d.protocolo && "numProtocolo" in next) next.numProtocolo = String(d.protocolo);
              if (d.licenca && "numLicenca" in next) next.numLicenca = String(d.licenca);
              if (d.validade && "validade" in next) next.validade = toDateInput(String(d.validade).split(" ")[0]);
              if (d.emissao && "dataProtocolo" in next) next.dataProtocolo = toDateInput(String(d.emissao).split(" ")[0]);
              if (d.razaoSocial && "observacoes" in next)
                next.observacoes = [String(next.observacoes || ""), `IMA/SC: ${d.modalidade || "licença"} — ${d.razaoSocial}`].filter(Boolean).join("\n");
            } else {
              if (d.protocolo && "numProtocolo" in next) next.numProtocolo = String(d.protocolo);
              if (d.numLicenca && "numLicenca" in next) next.numLicenca = String(d.numLicenca);
              if (d.dataValidade && "validade" in next) next.validade = toDateInput(String(d.dataValidade));
              if (d.dataEmissao && "dataProtocolo" in next) next.dataProtocolo = toDateInput(String(d.dataEmissao));
              if (d.condicionantes && "condicionantes" in next) next.condicionantes = String(d.condicionantes);
            }
            return next;
          });
          setDirty(true);
          toast(origem === "sigarh" ? "Dados do SIGARH preenchidos" : origem === "ima" ? "Dados do IMA/SC preenchidos" : "Dados do SIA/IAP preenchidos", "success");
        };

        let res = await fetch(`/api/sia/consulta?protocolo=${clean}`);
        if (res.ok) {
          const d = await res.json();
          if (d) return preencher(d, "sia");
        }
        res = await fetch(`/api/outorga/consulta?protocolo=${clean}`);
        if (res.ok) {
          const lista = await res.json();
          const d = Array.isArray(lista) ? lista[0] : null;
          if (d) return preencher(d, "sigarh");
        }
        res = await fetch(`/api/ima/consulta?protocolo=${clean}`);
        if (res.ok) {
          const lista = await res.json();
          const d = Array.isArray(lista) ? lista[0] : null;
          if (d) return preencher(d, "ima");
        }
        return toast("Licença/outorga não encontrada no SIA/IAP, SIGARH ou IMA/SC", "error");
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

  async function handleUpload(field: FieldConfig, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field.name);
    setUploadedFile(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/documentos/extract", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Erro ao processar documento", "error");
        return;
      }
      const camposPreenchidos: string[] = [];
      setForm((prev) => {
        const next = { ...prev };
        if (data.numLicenca && "numLicenca" in next) { next.numLicenca = data.numLicenca; camposPreenchidos.push("Nº Licença"); }
        if (data.numProtocolo && "numProtocolo" in next) { next.numProtocolo = data.numProtocolo; camposPreenchidos.push("Nº Protocolo"); }
        if (data.validade && "validade" in next) { next.validade = data.validade; camposPreenchidos.push("Validade"); }
        if (data.dataProtocolo && "dataProtocolo" in next) { next.dataProtocolo = data.dataProtocolo; camposPreenchidos.push("Data Protocolo"); }
        if (data.condicionantes && field.name in next) { next[field.name as keyof typeof next] = data.condicionantes as never; camposPreenchidos.push("Condicionantes"); }
        if (data.dadosEmpreendimento && "dadosEmpreendimento" in next) { next.dadosEmpreendimento = data.dadosEmpreendimento; camposPreenchidos.push("Dados do Empreendimento"); }
        return next;
      });
      setDirty(true);
      setUploadedFile(file.name);
      if (camposPreenchidos.length > 0) {
        toast(`Extraído: ${camposPreenchidos.join(", ")}`, "success");
      } else {
        toast("Nenhum campo identificado no documento", "info");
      }
    } catch {
      toast("Erro ao processar documento", "error");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <Topbar
        icon={Icon}
        title={method === "POST" ? `Novo ${entityName}` : `Editar ${entityName}`}
        subtitle={`Preencha os dados de ${entityName.toLowerCase()}`}
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <SectionCard icon={Icon} title="Informações" subtitle={entityName}>
            <div className="grid grid-cols-2 gap-5">
              {camposVisiveis.map((f) => (
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
                      className={`input-field ${fieldErrors[f.name] ? "input-error" : ""}`}
                      required={f.required}
                    >
                      <option value="">Selecione...</option>
                      {(f.optionsUrl ? (opcoesDinamicas[f.name] || []) : f.options || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <div className="space-y-2">
                      <textarea
                        value={form[f.name] as string || ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        rows={5}
                        className={`input-field resize-none ${fieldErrors[f.name] ? "input-error" : ""}`}
                      />
                      {f.upload && (
                        <label className={`focus-ring transition-brand flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-paper-200)] px-3 py-3 text-sm text-[var(--color-ink-500)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] ${uploading === f.name ? "opacity-60" : ""}`}>
                          {uploading === f.name ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Processando documento...
                            </>
                          ) : uploadedFile ? (
                            <>
                              <FileText size={16} className="text-green-600" />
                              <span className="text-green-700">Documento processado: {uploadedFile}</span>
                            </>
                          ) : (
                            <>
                              <FileText size={16} />
                              <span>Upload do documento para extrair condicionantes</span>
                            </>
                          )}
                          <input type="file" accept="image/*,.pdf" onChange={(e) => handleUpload(f, e)} className="hidden" disabled={uploading === f.name} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        step={f.step}
                        value={form[f.name] as string || ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        className={`input-field ${fieldErrors[f.name] ? "input-error" : ""}`}
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
                  {f.search === "sia" && !fieldErrors[f.name] && (
                    <p className="mt-1 text-xs text-[var(--color-ink-500)]">A busca consulta apenas os sistemas SIGARH, SIA/SGA e IMA/SC. Demais órgãos devem ser preenchidos manualmente.</p>
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
          </SectionCard>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="focus-ring transition-brand inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <ArrowLeft size={16} />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="focus-ring transition-brand inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
