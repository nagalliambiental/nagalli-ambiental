"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Users } from "lucide-react";

export default function NovoUsuarioPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "tecnico",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha.length < 8) {
      setErro("A senha precisa de pelo menos 8 caracteres");
      return;
    }
    setErro("");
    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const dados = await res.json().catch(() => ({}));
      setErro(dados.error || "Erro ao criar usuário");
      setSaving(false);
      return;
    }
    router.push("/usuarios");
    router.refresh();
  }

  return (
    <div>
      <Topbar icon={Users} title="Novo Usuário" subtitle="Cadastre um novo usuário no sistema" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          {erro && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{erro}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Senha</label>
              <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Perfil</label>
              <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                <option value="socio">Sócio</option>
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => router.back()} className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
