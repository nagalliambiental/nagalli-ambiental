export function formatDateTime(date: Date | string, style: "full" | "date" | "time" = "full"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "America/Sao_Paulo",
  };
  if (style === "date" || style === "full") {
    opts.day = "2-digit";
    opts.month = "2-digit";
    opts.year = "numeric";
  }
  if (style === "time" || style === "full") {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
  }
  return d.toLocaleDateString("pt-BR", opts);
}

export function formatDate(date: Date | string): string {
  return formatDateTime(date, "date");
}

export function dataInputParaDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const temHora = /T\d{2}:\d{2}/.test(s);
  if (temHora) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function dataInputParaIsoBR(v: string | Date | null | undefined): string | null {
  const d = dataInputParaDate(v);
  return d ? d.toISOString() : null;
}
