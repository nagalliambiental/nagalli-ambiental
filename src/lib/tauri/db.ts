/**
 * Tauri database service provider.
 *
 * This module provides a unified interface for data access
 * that transparently switches between Tauri (local SQLite) and
 * web (fetch to cloud API) modes.
 *
 * Usage:
 * ```ts
 * import { db } from "@/lib/tauri/db";
 * const clientes = await db.clientes.list();
 * ```
 */

import * as tauri from "./index";

function createService<TMethods extends Record<string, (...args: any[]) => any>>(methods: TMethods): TMethods {
  return methods;
}

export const db = {
  clientes: createService({
    list: (q?: string) => tauri.listClientes(q),
    get: (id: number) => tauri.getCliente(id),
    save: (input: any) => tauri.saveCliente(input),
    delete: (id: number) => tauri.deleteCliente(id),
  }),
  empreendimentos: createService({
    list: (q?: string, clienteId?: number) => tauri.listEmpreendimentos(q, clienteId),
    save: (input: any) => tauri.saveEmpreendimento(input),
    delete: (id: number) => tauri.deleteEmpreendimento(id),
  }),
  processos: createService({
    list: (empreendimentoId?: number) => tauri.listProcessos(empreendimentoId),
    save: (input: any) => tauri.saveProcesso(input),
  }),
  tarefas: createService({
    list: () => tauri.listTarefas(),
    save: (input: any) => tauri.saveTarefa(input),
  }),
  financeiros: createService({
    list: (clienteId?: number) => tauri.listFinanceiros(clienteId),
    save: (input: any) => tauri.saveFinanceiro(input),
  }),
};
