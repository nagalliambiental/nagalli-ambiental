mod db;
mod models;
mod sync;

use db::Database;
use models::*;
use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_updater::UpdaterExt;

struct AppState {
    db: Mutex<Database>,
    sync: Mutex<sync::SyncEngine>,
}

// ── Cliente commands ──────────────────────────────────────────

#[tauri::command]
fn list_clientes(state: State<'_, AppState>, q: Option<String>) -> Result<Vec<Cliente>, String> {
    state.db.lock().map_err(|e| e.to_string())?.list_clientes(q.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cliente(state: State<'_, AppState>, id: i64) -> Result<Cliente, String> {
    state.db.lock().map_err(|e| e.to_string())?.get_cliente(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_cliente(state: State<'_, AppState>, cliente: ClienteInput) -> Result<Cliente, String> {
    let saved = state.db.lock().map_err(|e| e.to_string())?.save_cliente(&cliente).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("cliente", "upsert", &saved)?;
    Ok(saved)
}

#[tauri::command]
fn delete_cliente(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.db.lock().map_err(|e| e.to_string())?.delete_cliente(id).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("cliente", "delete", &serde_json::json!({ "id": id }))?;
    Ok(())
}

// ── Empreendimento commands ───────────────────────────────────

#[tauri::command]
fn list_empreendimentos(state: State<'_, AppState>, q: Option<String>, cliente_id: Option<i64>) -> Result<Vec<Empreendimento>, String> {
    state.db.lock().map_err(|e| e.to_string())?.list_empreendimentos(q.as_deref(), cliente_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_empreendimento(state: State<'_, AppState>, emp: EmpreendimentoInput) -> Result<Empreendimento, String> {
    let saved = state.db.lock().map_err(|e| e.to_string())?.save_empreendimento(&emp).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("empreendimento", "upsert", &saved)?;
    Ok(saved)
}

#[tauri::command]
fn delete_empreendimento(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.db.lock().map_err(|e| e.to_string())?.delete_empreendimento(id).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("empreendimento", "delete", &serde_json::json!({ "id": id }))?;
    Ok(())
}

// ── Processo commands ─────────────────────────────────────────

#[tauri::command]
fn list_processos(state: State<'_, AppState>, empreendimento_id: Option<i64>) -> Result<Vec<Processo>, String> {
    state.db.lock().map_err(|e| e.to_string())?.list_processos(empreendimento_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_processo(state: State<'_, AppState>, processo: ProcessoInput) -> Result<Processo, String> {
    let saved = state.db.lock().map_err(|e| e.to_string())?.save_processo(&processo).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("processo", "upsert", &saved)?;
    Ok(saved)
}

// ── Tarefa commands ───────────────────────────────────────────

#[tauri::command]
fn list_tarefas(state: State<'_, AppState>) -> Result<Vec<Tarefa>, String> {
    state.db.lock().map_err(|e| e.to_string())?.list_tarefas().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_tarefa(state: State<'_, AppState>, tarefa: TarefaInput) -> Result<Tarefa, String> {
    let saved = state.db.lock().map_err(|e| e.to_string())?.save_tarefa(&tarefa).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("tarefa", "upsert", &saved)?;
    Ok(saved)
}

// ── Financeiro commands ───────────────────────────────────────

#[tauri::command]
fn list_financeiros(state: State<'_, AppState>, cliente_id: Option<i64>) -> Result<Vec<Financeiro>, String> {
    state.db.lock().map_err(|e| e.to_string())?.list_financeiros(cliente_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_financeiro(state: State<'_, AppState>, financeiro: FinanceiroInput) -> Result<Financeiro, String> {
    let saved = state.db.lock().map_err(|e| e.to_string())?.save_financeiro(&financeiro).map_err(|e| e.to_string())?;
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.enqueue("financeiro", "upsert", &saved)?;
    Ok(saved)
}

// ── Auth / online commands ────────────────────────────────────

#[tauri::command]
fn is_online() -> bool {
    is_online_inner()
}

#[tauri::command]
async fn sync_now(state: State<'_, AppState>, api_url: String, token: String) -> Result<SyncResult, String> {
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    sync.sync_all(&api_url, &token).await
}

fn is_online_inner() -> bool {
    // quick TCP check to cloud API
    std::net::TcpStream::connect_timeout(
        &std::net::SocketAddr::from(([8, 8, 8, 8], 53)),
        std::time::Duration::from_secs(3),
    )
    .is_ok()
}

#[tauri::command]
fn force_push_all(state: State<'_, AppState>, api_url: String, token: String) -> Result<String, String> {
    let sync = state.sync.lock().map_err(|e| e.to_string())?;
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(sync.sync_all(&api_url, &token)).map(|_| "Sincronizado com sucesso".into())
}

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await.map_err(|e| e.to_string())? {
        Some(update) => {
            let version = update.version().to_string();
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            Ok(Some(version))
        }
        None => Ok(None),
    }
}

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).ok();
            let db_path = app_dir.join("nagalli.db");

            let db = Database::new(db_path.to_str().unwrap()).expect("failed to init database");
            let sync = sync::SyncEngine::new(app_dir.join("sync_queue.json")).expect("failed to init sync");

            app.manage(AppState {
                db: Mutex::new(db),
                sync: Mutex::new(sync),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_clientes,
            get_cliente,
            save_cliente,
            delete_cliente,
            list_empreendimentos,
            save_empreendimento,
            delete_empreendimento,
            list_processos,
            save_processo,
            list_tarefas,
            save_tarefa,
            list_financeiros,
            save_financeiro,
            is_online,
            force_push_all,
            check_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
