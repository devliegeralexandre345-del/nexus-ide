# NexusIDE — Build & Deploy Guide

## 1. Build le .exe de production

```powershell
cd C:\Users\devli\Downloads\nexus-ide
npm run tauri:build
```

Premiere fois = ~5min. Ensuite ~30s.

Les installeurs generés sont dans :
```
src-tauri/target/release/bundle/
  nsis/NexusIDE_2.0.0_x64-setup.exe    <- Installer NSIS
  msi/NexusIDE_2.0.0_x64_en-US.msi    <- Installer MSI
```

## 2. Créer le repo GitHub PUBLIC (sans source)

1. github.com/new → nom: `nexus-ide-releases` → Public
2. Clone: `git clone https://github.com/TON-USERNAME/nexus-ide-releases.git`
3. Copie index.html + README.md + assets/ dans le repo
4. `git add . && git commit -m "v2.0.0" && git push`

## 3. Activer GitHub Pages

Settings → Pages → Source: main branch, / (root) → Save
Site dispo: `https://TON-USERNAME.github.io/nexus-ide-releases/`

## 4. Créer la Release

Releases → New → Tag: v2.0.0 → Upload les .exe/.msi → Publish

## 5. Mettre à jour les liens

Dans index.html, remplacer VOTRE-USERNAME par ton username GitHub.

## Rappel: le source code (src/, src-tauri/) reste PRIVE.
