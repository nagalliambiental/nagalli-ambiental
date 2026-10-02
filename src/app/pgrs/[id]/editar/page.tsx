"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, Upload, Loader2, FileCheck2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { useToast } from "@/components/Toast";

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-sm font-medium text-[var(--color-ink-700)] mb-1";

export default function EditarPgrsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    numero: "",
    orgao: "",
    deferidoEm: "",
    validade: "",
    validadeOrigem: "",
    alertaDias: "180",
    observacoes: "",
  });
  const [arquivoAtual, setArquivoAtual] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pgrs/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setForm({
          numero: data.numero || "",
          orgao: data.orgao || "",
          deferidoEm: data.deferidoEm ? String(data.deferidoEm).slice(0, 10) : "",
          validade: data.validade ? String(data.validade).slice(0, 10) : "",
          validadeOrigem: data.validadeOrigem || "",
          alertaDias: String(data.alertaDias ?? 180),
          observacoes: data.observacoes || "",
        });
        setArquivoAtual(data.arquivoNome || null);
        setLoading(false);
      })
      .catch(() => {
        setError("PGRS não encontrado");
        setLoading(false);
      });
  }, [params.id]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (!f) return;
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/pgrs/extract", { method: "POST", body: fd });
      if (!res.ok) {
        toast("Não foi possível ler o PDF — mantenha a validade atual", "warning");
        return;
      }
      const data = await res.json();
      if (data.deferidoEm) {
        setForm((prev) => ({ ...prev, deferidoEm: prev.deferidoEm || data.deferidoEm }));
      }
      if (data.validade) {
        setForm((prev) => ({ ...prev, validade: data.validade, validadeOrigem: "upload" }));
        const [y, m, d] = String(data.validade).split("-");
        toast(`Validade extraída do novo PDF: ${d}/${m}/${y}`, "success");
      } else {
        toast("Não foi possível identificar a validade no PDF", "warning");
      }
    } catch {
      toast("Erro ao ler o PDF", "error");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.validade) {
      setError("Informe a data de validade do PGRS");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("numero", form.numero);
      fd.append("orgao", form.orgao);
      fd.append("deferidoEm", form.deferidoEm);
      fd.append("validade", form.validade);
      fd.append("validadeOrigem", form.validadeOrigem || "manual");
      fd.append("alertaDias", form.alertaDias);
      fd.append("observacoes", form.observacoes);
      if (file) fd.append("arquivo", file);

      const res = await fetch(`/api/pgrs/${params.id}`, { method: "PUT", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Erro ao salvar PGRS");
        return;
      }
      toast("PGRS atualizado com sucesso", "success");
      router.push(`/pgrs/${params.id}`);
      router.refresh();
    } catch {
      setError("Erro ao salvar PGRS");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Topbar icon={ShieldCheck} title="Editar PGRS" />
        <p className="text-sm text-[var(--color-ink-500)]">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <Topbar icon={ShieldCheck} title="Editar PGRS" subtitle="Atualize os dados e a validade" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div>
            <label className={labelClass}>PDF do PGRS</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
                className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] disabled:opacity-50"
              >
                {extracting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {extracting ? "Lendo PDF..." : file ? "Trocar arquivo" : "Enviar novo PDF"}
              </button>
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
                {file ? (
                  <>
                    <FileCheck2 size={14} className="shrink-0 text-[var(--color-brand-600)]" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                  </>
                ) : (
                  arquivoAtual || "Nenhum PDF anexado"
                )}
              </span>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileChange} />
            <p className="mt-1 text-xs text-[var(--color-ink-500)]">Ao enviar um novo PDF, a validade é extraída automaticamente (você pode ajustar).</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nº do deferimento/protocolo</label>
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Órgão</label>
              <input value={form.orgao} onChange={(e) => setForm({ ...form, orgao: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Deferido em</label>
              <input type="date" value={form.deferidoEm} onChange={(e) => setForm({ ...form, deferidoEm: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                Validade <span className="text-red-500">*</span>
                {form.validadeOrigem === "upload" && (
                  <span className="ml-2 rounded bg-[var(--color-brand-50)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-brand-600)]">extraída do PDF</span>
                )}
              </label>
              <input
                type="date"
                value={form.validade}
                onChange={(e) => setForm({ ...form, validade: e.target.value, validadeOrigem: e.target.value ? "manual" : "" })}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Alerta (dias antes)</label>
              <input type="number" min={0} value={form.alertaDias} onChange={(e) => setForm({ ...form, alertaDias: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Observações</label>
              <input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={inputClass} />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || extracting}
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
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
      </div>
    </div>
  );
}
