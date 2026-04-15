use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use tauri::Emitter;

/// Holds file watcher state
pub struct FileWatcherState {
    watcher: Option<RecommendedWatcher>,
    watched_path: Option<PathBuf>,
}

impl FileWatcherState {
    pub fn new() -> Self {
        Self {
            watcher: None,
            watched_path: None,
        }
    }

    /// Start watching a directory. Events are emitted to the Tauri window.
    pub fn watch(&mut self, path: &str, window: &tauri::Window) -> Result<(), String> {
        // Stop previous watcher
        self.watcher = None;
        self.watched_path = None;

        let window_clone = window.clone();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let paths: Vec<String> = event
                        .paths
                        .iter()
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();

                    let kind = format!("{:?}", event.kind);

                    let _ = window_clone.emit("fs:change", serde_json::json!({
                        "kind": kind,
                        "paths": paths,
                    }));
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Cannot create watcher: {}", e))?;

        watcher
            .watch(std::path::Path::new(path), RecursiveMode::Recursive)
            .map_err(|e| format!("Cannot watch path: {}", e))?;

        self.watcher = Some(watcher);
        self.watched_path = Some(PathBuf::from(path));

        Ok(())
    }

    pub fn unwatch(&mut self) {
        if let (Some(watcher), Some(path)) = (&mut self.watcher, &self.watched_path) {
            let _ = watcher.unwatch(path);
        }
        self.watcher = None;
        self.watched_path = None;
    }
}
