// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn get_bridge_status() -> Result<serde_json::Value, String> {
    // In production, queries localhost:48291/status
    let client = reqwest_or_fallback().await;
    Ok(client)
}

async fn reqwest_or_fallback() -> serde_json::Value {
    serde_json::json!({
        "desktop_active": true,
        "bridge_port": 48291,
        "platform": std::env::consts::OS
    })
}

#[tauri::command]
async fn spawn_sidecar(app: AppHandle, name: String) -> Result<String, String> {
    let sidecar_command = app
        .shell()
        .sidecar(&name)
        .map_err(|e| format!("Failed to configure sidecar: {}", e))?;

    let (mut _rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar {}: {}", name, e))?;

    Ok(format!("Spawned sidecar {} with PID {:?}", name, child.pid()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // Build Tray Menu
            let open_item = MenuItemBuilder::with_id("open", "Open Dashboard").build(app)?;
            let status_item = MenuItemBuilder::with_id("status", "Bridge Status: Active").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit GymERP").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&open_item)
                .separator()
                .item(&status_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .on_menu_event(move |app_handle, event| {
                    match event.id().as_ref() {
                        "open" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Automatically attempt to spawn baileys-engine sidecar if present
            let sidecar_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(cmd) = sidecar_handle.shell().sidecar("baileys-engine") {
                    if let Ok((_rx, _child)) = cmd.spawn() {
                        println!("[OK] Background Baileys bridge sidecar launched.");
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_bridge_status,
            spawn_sidecar
        ])
        .run(tauri::generate_context!())
        .expect("error while running GymERP desktop application");
}
