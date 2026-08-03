export function ehPrivilegiado(perfil?: string) {
  return perfil === "socio" || perfil === "admin";
}
