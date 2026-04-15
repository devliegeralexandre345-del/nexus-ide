# Lorica IDE

**Secure • AI-Powered • Native**

IDE nouvelle génération construit avec **Tauri 2 + Rust** (backend) et **React + CodeMirror** (frontend).

## Stack

| Couche | Technologie |
|--------|-------------|
| Backend | Rust (Tauri 2) |
| Frontend | React 18 + Tailwind CSS |
| Éditeur | CodeMirror 6 |
| Crypto | ring (XChaCha20-Poly1305) + Argon2id |
| Terminal | portable-pty |
| File watch | notify |
| Large files | mmap + piece table |

## Lancement rapide

### Prérequis

- **Rust** : [rustup.rs](https://rustup.rs)
- **Node.js 18+** : [nodejs.org](https://nodejs.org)
- **Linux** : `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev`
- **Windows** : Visual Studio Build Tools + WebView2
- **macOS** : Xcode Command Line Tools

### Installation

```bash
# Linux/macOS
chmod +x setup.sh && ./setup.sh

# Windows
setup.bat

# Ou manuellement :
npm install
cd src-tauri && cargo build && cd ..
```

### Développement

```bash
npm run tauri:dev
```

### Build production

```bash
npm run tauri:build
# → Binaire dans src-tauri/target/release/
```

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+P` | Command Palette |
| `Ctrl+S` | Sauvegarder |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+`` ` | Toggle Terminal |
| `Ctrl+Shift+A` | Toggle AI Copilot |
| `Ctrl+K → Z` | Zen Mode |
| `Ctrl+\` | Split Editor |
| `Ctrl+L` | Verrouiller l'IDE |
| `Escape` | Fermer / Quitter Zen |

## Sécurité

- Vault chiffré XChaCha20-Poly1305 avec KDF Argon2id
- Clés verrouillées en RAM (`mlock`) — jamais swappées sur disque
- Zéroisation automatique de la mémoire au déverrouillage (`zeroize`)
- Audit log avec hash chaîné SHA-256 (anti-tamper)
- Scan de secrets dans le code (API keys, tokens, passwords)

## Structure

```
lorica/
├── src/                      # Frontend React
│   ├── index.jsx             # Entry point
│   ├── loricaBridge.js        # Tauri ↔ React bridge
│   ├── App.jsx               # App principal
│   ├── components/           # 17 composants React
│   ├── hooks/                # 4 hooks custom
│   ├── store/                # Reducer + state
│   ├── utils/                # Languages, themes
│   └── styles/               # CSS global
├── src-tauri/                # Backend Rust
│   ├── src/
│   │   ├── lib.rs            # Entry + command registration
│   │   ├── filesystem.rs     # File I/O natif
│   │   ├── security.rs       # Vault chiffré
│   │   ├── terminal.rs       # PTY natif
│   │   ├── buffer.rs         # Helix Buffer (mmap + piece table)
│   │   └── watcher.rs        # File watcher
│   ├── Cargo.toml
│   └── tauri.conf.json
├── webpack.config.js
├── tailwind.config.js
└── package.json
```
