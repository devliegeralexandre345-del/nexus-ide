@echo off
REM ================================================
REM Lorica — Tauri Migration Setup (Windows)
REM ================================================

echo ╔══════════════════════════════════════════════╗
echo ║     Lorica — Tauri Migration Setup         ║
echo ╚══════════════════════════════════════════════╝
echo.

REM Check Rust
where rustc >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Rust not found.
    echo    Download from: https://rustup.rs
    echo    Then re-run this script.
    pause
    exit /b 1
) else (
    echo ✅ Rust found
)

REM Check Node
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
) else (
    echo ✅ Node found
)

echo.
echo 📦 Installing Tauri CLI...
call npm install -g @tauri-apps/cli

echo.
echo 📦 Installing npm dependencies...
call npm install

echo.
echo 🔨 Building Rust backend (first build = 2-3 min)...
cd src-tauri
cargo build
cd ..

echo.
echo ╔══════════════════════════════════════════════╗
echo ║              Setup Complete! ✅               ║
echo ╠══════════════════════════════════════════════╣
echo ║                                              ║
echo ║  Run:   npm run tauri:dev                    ║
echo ║  Build: npm run tauri:build                  ║
echo ║                                              ║
echo ╚══════════════════════════════════════════════╝
pause
