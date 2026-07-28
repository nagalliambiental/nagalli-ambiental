"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Email ou senha inválidos");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#365623] to-[#1F3213]">
      <div className="bg-[var(--color-paper-0)] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--color-paper-200)]">
        <div className="flex flex-col items-center mb-8">
          <Image src="/Logo1.jpeg" alt="Nagalli Ambiental" width={80} height={80} className="rounded-xl mb-4" />
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">Nagalli Ambiental</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Sistema de Gestão Ambiental</p>
        </div>
        <div className="river-divider rounded mb-6" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="focus-ring transition-brand w-full px-4 py-2.5 border border-[var(--color-paper-200)] rounded-lg text-sm bg-white text-[var(--color-ink-900)] placeholder-[var(--color-ink-300)]"
              placeholder="seu@email.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Senha</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="focus-ring transition-brand w-full px-4 py-2.5 border border-[var(--color-paper-200)] rounded-lg text-sm bg-white text-[var(--color-ink-900)] placeholder-[var(--color-ink-300)]"
              placeholder="••••••" required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="focus-ring transition-brand w-full bg-[var(--color-brand-500)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-500)] mt-6">
          Primeiro acesso?{" "}
          <a href="/register" className="font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  );
}
