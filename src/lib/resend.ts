const RESEND_API = "https://api.resend.com/emails";

export interface EmailAnexo {
  filename: string;
  content: Buffer;
}

export interface EnviarEmailInput {
  to: string[];
  subject: string;
  html: string;
  anexos?: EmailAnexo[];
}

export async function enviarEmail({ to, subject, html, anexos }: EnviarEmailInput): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada no ambiente — cadastre a chave da conta Resend no .env");
  }
  const from = process.env.RESEND_FROM || "Nagalli Ambiental <onboarding@resend.dev>";

  const payload: Record<string, unknown> = { from, to, subject, html };
  if (anexos?.length) {
    payload.attachments = anexos.map((a) => ({ filename: a.filename, content: a.content.toString("base64") }));
  }

  let res: Response;
  try {
    res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Falha de conexão com o Resend — verifique a internet/chave de API");
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };

  if (!res.ok) {
    const detalhe = data.message || data.name || `HTTP ${res.status}`;
    throw new Error(`Resend rejeitou o envio: ${detalhe}`);
  }
  if (!data.id) {
    throw new Error("Resend não retornou o identificador do e-mail");
  }
  return { id: data.id };
}
