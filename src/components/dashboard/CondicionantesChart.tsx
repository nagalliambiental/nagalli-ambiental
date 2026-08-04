"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS: Record<string, string> = {
  Pendente: "#f59e0b",
  "Em Andamento": "#3b82f6",
  Cumprida: "#22c55e",
  Vencida: "#ef4444",
  Suspensa: "#6b7280",
};

export function CondicionantesChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--color-ink-500)] text-center py-8">Nenhuma condicionante cadastrada</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${value} condicionante(s)`, "Quantidade"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name] || "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
