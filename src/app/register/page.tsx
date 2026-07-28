"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", confirmarSenha: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.senha !== form.confirmarSenha) {
      setError("Senhas não conferem");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email: form.email, password: form.senha, redirect: false });
    if (result?.ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#365623] to-[#1F3213]">
      <div className="bg-[var(--color-paper-0)] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--color-paper-200)]">
        <div className="flex flex-col items-center mb-8">
          <Image src="/Logo1.jpeg" alt="Nagalli Ambiental" width={80} height={80} className="rounded-xl mb-4" />
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">Criar Conta</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Nagalli Ambiental</p>
        </div>
        <div className="river-divider rounded mb-6" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome</label>
            <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="focus-ring transition-brand w-full px-4 py-2.5 border border-[var(--color-paper-200)] rounded-lg text-sm bg-white text-[var(--color-ink-900)] placeholder-[var(--color-ink-300)]"
              placeholder="Seu nome" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="focus-ring transition-brand w-full px-4 py-2.5 border border-[var(--color-paper-200)] rounded-lg text-sm bg-white text-[var(--color-ink-900)] placeholder-[var(--color-ink-300)]"
              placeholder="seu@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Senha</label>
            <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="focus-ring transition-brand w-full px-4 py-2.5 border border-[var(--color-paper-200)] rounded-lg text-sm bg-white text-[var(--color-ink-900)] placeholder-[var(--color-ink-300)]"
              placeholder="••••••" required minLength={4} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Confirmar Senha</label>
            <input type="password" value={form.confirmarSenha} onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
              className="focus-ring transition-brand w-full px-4 py-2.5 border border-[var(--color-paper-200)] rounded-lg text-sm bg-white text-[var(--color-ink-900)] placeholder-[var(--color-ink-300)]"
              placeholder="••••••" required minLength={4} />
          </div>
          <button type="submit" disabled={loading}
            className="focus-ring transition-brand w-full bg-[var(--color-brand-500)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Conta"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-500)] mt-6">
          Já tem conta?{" "}
          <a href="/login" className="font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}
