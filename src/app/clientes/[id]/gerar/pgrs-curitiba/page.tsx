export function generateStaticParams() { return []; }

export default function Page() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center text-sm text-[var(--color-ink-500)]">
        <p className="font-medium text-[var(--color-ink-700)]">PGRS Curitiba</p>
        <p className="mt-1">Disponível apenas na versão web.</p>
      </div>
    </div>
  );
}
