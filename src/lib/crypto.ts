import crypto from "crypto";

const KEY_HEX = process.env.CRIPTOGRAFIA_SECRET || "nagalli-ambiental-dev-secret";
const KEY = crypto.createHash("sha256").update(KEY_HEX).digest();
const ALGORITMO = "aes-256-gcm";

export function criptografar(valor: string): string {
  if (!valor) return valor;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, KEY, iv);
  const cifrado = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${cifrado.toString("base64")}`;
}

export function descriptografar(valor: string): string {
  if (!valor) return valor;
  if (!valor.startsWith("enc:v1:")) return valor;

  const [, , ivB64, tagB64, dataB64] = valor.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return valor;

  try {
    const decipher = crypto.createDecipheriv(ALGORITMO, KEY, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return valor;
  }
}
