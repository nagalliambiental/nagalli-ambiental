"use client";

import { useState } from "react";
import { Building2, Mail } from "lucide-react";
import { ClientesTable } from "@/components/tables/ClientesTable";
import { ContatosGerenciador } from "@/components/ContatosGerenciador";

interface ClienteComEmpreendimentos {
  id: number;
  apelido: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  _count: { empreendimentos: number };
  empreendimentos: {
    id: number;
    apelido: string;
    unidadeSinir?: string | null;
  }[];
}

export function ClientesAbas({ clientes }: { clientes: ClienteComEmpreendimentos[] }) {
  const [aba, setAba] = useState<"clientes" | "contatos">("clientes");

  return (
    <div className="space-y-4">
      <div className="border-b border-[var(--color-paper-200)]">
        <nav className="flex gap-1" aria-label="Abas de clientes">
          <button
            onClick={() => setAba("clientes")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-card)] transition-colors ${
              aba === "clientes"
                ? "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"
            }`}
          >
            <Building2 size={16} />
            Clientes
          </button>
          <button
            onClick={() => setAba("contatos")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-[var(--radius-card)] transition-colors ${
              aba === "contatos"
                ? "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"
            }`}
          >
            <Mail size={16} />
            Contatos por empreendimento
          </button>
        </nav>
      </div>

      {aba === "clientes" && <ClientesTable data={clientes} />}
      {aba === "contatos" && <ContatosGerenciador clientes={clientes} />}
    </div>
  );
}