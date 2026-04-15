use std::sync::Mutex;
use tauri::AppHandle;

use crate::security::VaultState;
use crate::terminal::TerminalManager;
use crate::buffer::BufferManager;
use crate::watcher::FileWatcherState;

pub struct AppState {
    pub vault: Mutex<VaultState>,
    pub terminals: Mutex<TerminalManager>,
    pub buffers: Mutex<BufferManager>,
    pub watcher: Mutex<FileWatcherState>,
    pub app_handle: AppHandle,
}

impl AppState {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            vault: Mutex::new(VaultState::new(&app_handle)),
            terminals: Mutex::new(TerminalManager::new()),
            buffers: Mutex::new(BufferManager::new()),
            watcher: Mutex::new(FileWatcherState::new()),
            app_handle,
        }
    }
}
