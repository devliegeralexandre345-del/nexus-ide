// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lorica_lib::run().expect("Failed to start Lorica")
}

