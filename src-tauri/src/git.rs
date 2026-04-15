use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::filesystem::CmdResult;

// ======================================================
// Types
// ======================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,       // "M", "A", "D", "?", "R", "C", "U"
    pub staged: bool,
    pub status_text: String,  // "modified", "added", "deleted", etc.
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<GitFileStatus>,
    pub is_repo: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitLogEntry {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitBranch {
    pub name: String,
    pub current: bool,
}

// ======================================================
// Helpers
// ======================================================

fn run_git(project_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(project_path)
        .args(args)
        .output()
        .map_err(|e| format!("git not found: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(stderr.trim().to_string())
    }
}

fn parse_status_code(code: &str) -> &str {
    match code {
        "M" => "modified",
        "A" => "added",
        "D" => "deleted",
        "R" => "renamed",
        "C" => "copied",
        "U" => "unmerged",
        "?" => "untracked",
        "!" => "ignored",
        _ => "unknown",
    }
}

// ======================================================
// Commands
// ======================================================

#[tauri::command]
pub fn cmd_git_status(project_path: String) -> CmdResult<GitStatus> {
    // Check if it's a git repo
    if run_git(&project_path, &["rev-parse", "--git-dir"]).is_err() {
        return CmdResult::ok(GitStatus {
            branch: String::new(),
            ahead: 0,
            behind: 0,
            files: vec![],
            is_repo: false,
        });
    }

    // Get branch name
    let branch = run_git(&project_path, &["branch", "--show-current"])
        .unwrap_or_default()
        .trim()
        .to_string();

    // Get ahead/behind
    let mut ahead = 0;
    let mut behind = 0;
    if let Ok(ab) = run_git(&project_path, &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]) {
        let parts: Vec<&str> = ab.trim().split_whitespace().collect();
        if parts.len() == 2 {
            ahead = parts[0].parse().unwrap_or(0);
            behind = parts[1].parse().unwrap_or(0);
        }
    }

    // Get file statuses
    let status_output = run_git(&project_path, &["status", "--porcelain=v1"])
        .unwrap_or_default();

    let mut files = Vec::new();
    for line in status_output.lines() {
        if line.len() < 4 { continue; }
        let index_status = &line[0..1];
        let work_status = &line[1..2];
        let file_path = line[3..].trim().to_string();

        // Determine the display status
        let (status, staged) = if index_status != " " && index_status != "?" {
            (index_status.to_string(), true)
        } else {
            let s = if work_status == "?" { "?" } else { work_status };
            (s.to_string(), false)
        };

        files.push(GitFileStatus {
            status_text: parse_status_code(&status).to_string(),
            path: file_path,
            status,
            staged,
        });
    }

    CmdResult::ok(GitStatus {
        branch,
        ahead,
        behind,
        files,
        is_repo: true,
    })
}

#[tauri::command]
pub fn cmd_git_stage(project_path: String, file_path: String) -> CmdResult<bool> {
    run_git(&project_path, &["add", &file_path])
        .map(|_| CmdResult::ok(true))
        .unwrap_or_else(|e| CmdResult::err(e))
}

#[tauri::command]
pub fn cmd_git_unstage(project_path: String, file_path: String) -> CmdResult<bool> {
    run_git(&project_path, &["restore", "--staged", &file_path])
        .map(|_| CmdResult::ok(true))
        .unwrap_or_else(|e| CmdResult::err(e))
}

#[tauri::command]
pub fn cmd_git_stage_all(project_path: String) -> CmdResult<bool> {
    run_git(&project_path, &["add", "-A"])
        .map(|_| CmdResult::ok(true))
        .unwrap_or_else(|e| CmdResult::err(e))
}

#[tauri::command]
pub fn cmd_git_commit(project_path: String, message: String) -> CmdResult<String> {
    match run_git(&project_path, &["commit", "-m", &message]) {
        Ok(output) => CmdResult::ok(output.trim().to_string()),
        Err(e) => CmdResult::err(e),
    }
}

#[tauri::command]
pub fn cmd_git_push(project_path: String) -> CmdResult<String> {
    match run_git(&project_path, &["push"]) {
        Ok(output) => CmdResult::ok(output.trim().to_string()),
        Err(e) => CmdResult::err(e),
    }
}

#[tauri::command]
pub fn cmd_git_pull(project_path: String) -> CmdResult<String> {
    match run_git(&project_path, &["pull"]) {
        Ok(output) => CmdResult::ok(output.trim().to_string()),
        Err(e) => CmdResult::err(e),
    }
}

#[tauri::command]
pub fn cmd_git_log(project_path: String, count: Option<usize>) -> CmdResult<Vec<GitLogEntry>> {
    let count_str = format!("-{}", count.unwrap_or(50));
    let format = "--pretty=format:%H||%h||%s||%an||%ar";

    match run_git(&project_path, &["log", &count_str, format]) {
        Ok(output) => {
            let entries: Vec<GitLogEntry> = output
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.splitn(5, "||").collect();
                    if parts.len() == 5 {
                        Some(GitLogEntry {
                            hash: parts[0].to_string(),
                            short_hash: parts[1].to_string(),
                            message: parts[2].to_string(),
                            author: parts[3].to_string(),
                            date: parts[4].to_string(),
                        })
                    } else {
                        None
                    }
                })
                .collect();
            CmdResult::ok(entries)
        }
        Err(e) => CmdResult::err(e),
    }
}

#[tauri::command]
pub fn cmd_git_diff(project_path: String, file_path: Option<String>) -> CmdResult<String> {
    let mut args = vec!["diff", "--no-color"];
    let fp;
    if let Some(ref f) = file_path {
        fp = f.clone();
        args.push("--");
        args.push(&fp);
    }
    match run_git(&project_path, &args) {
        Ok(output) => CmdResult::ok(output),
        Err(e) => CmdResult::err(e),
    }
}

#[tauri::command]
pub fn cmd_git_branches(project_path: String) -> CmdResult<Vec<GitBranch>> {
    match run_git(&project_path, &["branch", "--list"]) {
        Ok(output) => {
            let branches: Vec<GitBranch> = output
                .lines()
                .map(|line| {
                    let current = line.starts_with('*');
                    let name = line.trim_start_matches('*').trim().to_string();
                    GitBranch { name, current }
                })
                .collect();
            CmdResult::ok(branches)
        }
        Err(e) => CmdResult::err(e),
    }
}

#[tauri::command]
pub fn cmd_git_checkout(project_path: String, branch: String) -> CmdResult<bool> {
    run_git(&project_path, &["checkout", &branch])
        .map(|_| CmdResult::ok(true))
        .unwrap_or_else(|e| CmdResult::err(e))
}

#[tauri::command]
pub fn cmd_git_discard(project_path: String, file_path: String) -> CmdResult<bool> {
    run_git(&project_path, &["checkout", "--", &file_path])
        .map(|_| CmdResult::ok(true))
        .unwrap_or_else(|e| CmdResult::err(e))
}
