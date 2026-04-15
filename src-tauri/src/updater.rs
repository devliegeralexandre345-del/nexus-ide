use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs::File;
use std::io::Write;

/// GitHub Release asset structure
#[derive(Debug, Deserialize, Serialize, Clone)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

/// GitHub Release structure
#[derive(Debug, Deserialize, Serialize, Clone)]
struct GitHubRelease {
    tag_name: String,
    name: String,
    body: String,
    published_at: String,
    assets: Vec<GitHubAsset>,
}

/// Release info to expose to frontend
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseInfo {
    pub version: String,
    pub download_url: String,
    pub body: String,
    pub published_at: String,
}

/// Compares two semantic version strings (format "1.2.3" or "v1.2.3")
/// Returns true if new_version > current_version
fn is_newer_version(current: &str, new: &str) -> bool {
    fn normalize(v: &str) -> &str {
        v.trim_start_matches('v').trim()
    }
    let current_parts: Vec<u32> = normalize(current)
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let new_parts: Vec<u32> = normalize(new)
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    // Compare major, minor, patch
    for (c, n) in current_parts.iter().zip(new_parts.iter()) {
        if n > c {
            return true;
        } else if n < c {
            return false;
        }
    }
    // If equal up to common length, longer version is newer (e.g., 1.2.3.4 > 1.2.3)
    new_parts.len() > current_parts.len()
}

/// Fetches the latest release from GitHub
async fn fetch_latest_release() -> Result<GitHubRelease, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/devliegeralexandre345-del/lorica/releases/latest")
        .header("User-Agent", "Lorica-Updater")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let release: GitHubRelease = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(release)
}

/// Finds the appropriate installer asset for Windows
fn find_windows_installer_asset(release: &GitHubRelease) -> Option<&GitHubAsset> {
    // Prefer .exe (NSIS installer), fallback to .msi
    release
        .assets
        .iter()
        .find(|asset| asset.name.ends_with(".exe") || asset.name.ends_with(".msi"))
}

/// Convert GitHub release to ReleaseInfo
fn release_to_info(release: GitHubRelease, download_url: String) -> ReleaseInfo {
    ReleaseInfo {
        version: release.tag_name.trim_start_matches('v').to_string(),
        download_url,
        body: release.body,
        published_at: release.published_at,
    }
}

#[tauri::command]
pub async fn check_for_update() -> Result<Option<ReleaseInfo>, String> {
    let current_version = env!("CARGO_PKG_VERSION");

    let release = match fetch_latest_release().await {
        Ok(r) => r,
        Err(e) => {
            log::warn!("Update check failed: {}", e);
            return Ok(None);
        }
    };

    if !is_newer_version(current_version, &release.tag_name) {
        return Ok(None);
    }

    let download_url = find_windows_installer_asset(&release)
        .map(|asset| asset.browser_download_url.clone())
        .ok_or_else(|| String::from("No Windows installer found in release"))?;

    Ok(Some(release_to_info(release, download_url)))
}

#[tauri::command]
pub async fn download_and_install_update(download_url: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&download_url)
        .header("User-Agent", "Lorica-Updater")
        .send()
        .await
        .map_err(|e| format!("Failed to download installer: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    let temp_dir = std::env::temp_dir();
    let file_name = download_url
        .split('/')
        .last()
        .unwrap_or("lorica-installer.exe");
    let installer_path = temp_dir.join(file_name);

    let mut file = File::create(&installer_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    log::info!("Installer downloaded to {:?}", installer_path);

    // Launch installer on Windows
    if cfg!(target_os = "windows") {
        let path_str = installer_path
            .to_str()
            .ok_or_else(|| String::from("Invalid installer path"))?;
        Command::new("cmd")
            .args(&["/C", "start", "", path_str])
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
        log::info!("Installer launched successfully");
    } else {
        return Err("Automatic installation is only supported on Windows".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_newer_version() {
        assert!(is_newer_version("1.1.0", "1.2.0"));
        assert!(is_newer_version("1.1.0", "2.0.0"));
        assert!(is_newer_version("1.1.0", "1.1.1"));
        assert!(!is_newer_version("1.2.0", "1.1.0"));
        assert!(!is_newer_version("1.2.0", "1.2.0"));
        assert!(is_newer_version("v1.1.0", "v1.2.0"));
        assert!(is_newer_version("1.1.0", "v1.2.0"));
    }
}
