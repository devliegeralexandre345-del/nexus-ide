use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty};
use std::collections::HashMap;
use std::io::{Read, Write};

use std::thread;
use tauri::Emitter;

use crate::filesystem::CmdResult;
use crate::state::AppState;

// ======================================================
// Terminal Manager
// ======================================================

struct PtyInstance {
    writer: Box<dyn Write + Send>,
    #[allow(dead_code)]
    master: Box<dyn MasterPty + Send>,
}

pub struct TerminalManager {
    instances: HashMap<u32, PtyInstance>,
    next_id: u32,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            instances: HashMap::new(),
            next_id: 1,
        }
    }
}

// ======================================================
// Commands
// ======================================================

#[tauri::command]
pub fn cmd_terminal_create(
    window: tauri::Window,
    state: tauri::State<AppState>,
) -> CmdResult<u32> {
    let pty_system = native_pty_system();

    let pair = match pty_system.openpty(PtySize {
        rows: 30,
        cols: 120,
        pixel_width: 0,
        pixel_height: 0,
    }) {
        Ok(p) => p,
        Err(e) => return CmdResult::err(format!("PTY open failed: {}", e)),
    };

    // Determine shell
    let shell = if cfg!(target_os = "windows") {
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    };

    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    // Spawn shell — this consumes the slave
    let mut child = match pair.slave.spawn_command(cmd) {
        Ok(c) => c,
        Err(e) => return CmdResult::err(format!("Shell spawn failed: {}", e)),
    };
    // slave is now consumed/dropped — this is required for PTY to work

    // Get reader BEFORE writer (order matters on some platforms)
    let mut reader = match pair.master.try_clone_reader() {
        Ok(r) => r,
        Err(e) => return CmdResult::err(format!("Cannot clone reader: {}", e)),
    };

    let writer = match pair.master.take_writer() {
        Ok(w) => w,
        Err(e) => return CmdResult::err(format!("Cannot take writer: {}", e)),
    };

    // Assign ID
    let mut manager = state.terminals.lock().unwrap();
    let id = manager.next_id;
    manager.next_id += 1;
    manager.instances.insert(id, PtyInstance { writer, master: pair.master });
    drop(manager);

    // Background thread: read PTY output → emit to frontend
    let win = window.clone();
    let term_id = id;
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    log::info!("Terminal {} EOF", term_id);
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    if win.emit("terminal:data", &data).is_err() {
                        log::warn!("Terminal {} emit failed, stopping reader", term_id);
                        break;
                    }
                }
                Err(e) => {
                    log::warn!("Terminal {} read error: {}", term_id, e);
                    break;
                }
            }
        }
    });

    // Background thread: wait for child exit
    thread::spawn(move || {
        match child.wait() {
            Ok(status) => log::info!("Terminal shell exited: {:?}", status),
            Err(e) => log::warn!("Terminal wait error: {}", e),
        }
    });

    log::info!("Terminal {} created with shell: {}", id, shell);
    CmdResult::ok(id)
}

#[tauri::command]
pub fn cmd_terminal_write(data: String, state: tauri::State<AppState>) -> CmdResult<bool> {
    let mut manager = state.terminals.lock().unwrap();
    if let Some((_, instance)) = manager.instances.iter_mut().next() {
        match instance.writer.write_all(data.as_bytes()) {
            Ok(_) => {
                let _ = instance.writer.flush();
                CmdResult::ok(true)
            }
            Err(e) => CmdResult::err(format!("Write failed: {}", e)),
        }
    } else {
        CmdResult::err("No terminal instance")
    }
}

#[tauri::command]
pub fn cmd_terminal_resize(
    _cols: u16,
    _rows: u16,
    _state: tauri::State<AppState>,
) -> CmdResult<bool> {
    // Resize needs the master handle — stored in PtyInstance
    // TODO: implement via master.resize() in a future version
    CmdResult::ok(true)
}

#[tauri::command]
pub fn cmd_terminal_kill(state: tauri::State<AppState>) -> CmdResult<bool> {
    let mut manager = state.terminals.lock().unwrap();
    manager.instances.clear(); // Drops writers + masters, closing the PTY
    CmdResult::ok(true)
}
