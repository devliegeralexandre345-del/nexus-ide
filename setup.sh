#!/bin/bash
# ================================================
# Lorica — Setup Script
# Supports Linux (Debian/Ubuntu, Fedora/RHEL, Arch)
# and macOS
# ================================================

set -e

echo "╔══════════════════════════════════════════════╗"
echo "║          Lorica — Setup Script             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Detect OS ──────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
    Linux*)  PLATFORM="linux" ;;
    Darwin*) PLATFORM="macos" ;;
    *)       echo "Unsupported platform: $OS"; exit 1 ;;
esac
echo "Platform: $PLATFORM"
echo ""

# ── Linux system dependencies (required by Tauri) ──
if [ "$PLATFORM" = "linux" ]; then
    echo "📦 Installing Linux system dependencies for Tauri..."

    if command -v apt-get &> /dev/null; then
        # Debian / Ubuntu
        sudo apt-get update -q
        sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            patchelf \
            libssl-dev \
            pkg-config \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libglib2.0-dev
        echo "✅ Debian/Ubuntu dependencies installed"

    elif command -v dnf &> /dev/null; then
        # Fedora / RHEL
        sudo dnf install -y \
            webkit2gtk4.1-devel \
            libayatana-appindicator-gtk3-devel \
            librsvg2-devel \
            patchelf \
            openssl-devel \
            pkg-config \
            gcc \
            curl \
            wget \
            file \
            xdotool-devel
        echo "✅ Fedora/RHEL dependencies installed"

    elif command -v pacman &> /dev/null; then
        # Arch Linux
        sudo pacman -Syu --noconfirm \
            webkit2gtk-4.1 \
            libayatana-appindicator \
            librsvg \
            patchelf \
            openssl \
            pkg-config \
            base-devel \
            curl \
            wget \
            file \
            xdotool
        echo "✅ Arch Linux dependencies installed"

    else
        echo "⚠️  Unknown package manager. Install manually:"
        echo "   - webkit2gtk-4.1-dev"
        echo "   - libayatana-appindicator3-dev"
        echo "   - librsvg2-dev"
        echo "   - patchelf"
        echo "   - libssl-dev"
        echo "   See: https://tauri.app/start/prerequisites/#linux"
        echo ""
    fi
fi

# ── Rust ───────────────────────────────────────────
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust $(rustc --version)"
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found"
    exit 1
else
    echo "✅ Cargo $(cargo --version)"
fi

# ── Node.js ────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    echo "   https://nodejs.org/"
    exit 1
else
    echo "✅ Node $(node --version)"
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
else
    echo "✅ npm $(npm --version)"
fi

# ── Tauri CLI ──────────────────────────────────────
echo ""
echo "📦 Installing Tauri CLI..."
npm install -g @tauri-apps/cli 2>/dev/null || cargo install tauri-cli --version "^2.0.0"

# ── npm dependencies ───────────────────────────────
echo ""
echo "📦 Installing npm dependencies..."
npm install

# ── Rust build ─────────────────────────────────────
echo ""
echo "🔨 Building Rust backend (first build takes 2-3 minutes)..."
cd src-tauri
cargo build 2>&1 | tail -5
cd ..

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              Setup Complete! ✅               ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  Dev:   npm run tauri:dev                    ║"
echo "║  Build: npm run tauri:build                  ║"
echo "║                                              ║"
echo "║  Linux packages generated:                   ║"
echo "║    .deb  (Debian/Ubuntu)                     ║"
echo "║    .AppImage  (universal)                    ║"
echo "║    .rpm  (Fedora/RHEL)                       ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
