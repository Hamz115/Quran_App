use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct SidecarState {
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn kill_sidecar(state: tauri::State<'_, SidecarState>) {
    let maybe_child = state.child.lock().unwrap().take();
    if let Some(child) = maybe_child {
        let _ = child.kill();
        eprintln!("[backend] sidecar killed before update");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![kill_sidecar])
        .manage(SidecarState {
            child: Mutex::new(None),
        })
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            // Spawn the FastAPI sidecar on startup
            let sidecar = app
                .shell()
                .sidecar("quran-backend")
                .expect("failed to create sidecar command");

            let (mut rx, child) = sidecar
                .spawn()
                .expect("failed to spawn sidecar");

            // Store the child handle for cleanup on close
            let state = app.state::<SidecarState>();
            *state.child.lock().unwrap() = Some(child);

            // Log sidecar output in the background
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            eprintln!("[backend:out] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[backend:err] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(status) => {
                            eprintln!("[backend] terminated: {:?}", status);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill the sidecar when the window is closed
                let state: tauri::State<SidecarState> = window.state();
                let maybe_child = state.child.lock().unwrap().take();
                if let Some(child) = maybe_child {
                    let _ = child.kill();
                    eprintln!("[backend] sidecar killed on window close");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
