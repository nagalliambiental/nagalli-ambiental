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
