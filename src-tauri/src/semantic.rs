// src-tauri/src/semantic.rs
//
// Local semantic search. Runs an ONNX embedding model (all-MiniLM-L6-v2,
// 384-dim, ~23 MB) on the user's machine so nothing leaves the box. The
// index lives at `<project>/.lorica/semantic.bin` (bincode).
//
// Design choices:
//   • Chunking is line-window based (50 lines, 10-line overlap). AST-aware
//     chunking is better but pulls in tree-sitter per language — not worth
//     the complexity for v1. A 50-line window still captures enough context
//     for the embedding to be meaningful.
//   • In-memory brute-force cosine similarity. For a typical repo (<50k
//     chunks) this is ~5–20 ms per query on modern CPU and avoids dragging
//     in a vector database dependency. Upgrade to HNSW only if it becomes
//     a bottleneck.
//   • fastembed returns L2-normalized vectors, so `dot == cosine`. We skip
//     the divide.
//   • The model is lazy-loaded inside each command because `TextEmbedding`
//     isn't `Send + Sync` (contains `!Send` ort internals on some targets).
//     Loading is cheap after the one-time model download — fastembed keeps
//     the weights in the OS cache.

use chrono::Utc;
use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use walkdir::WalkDir;

use crate::filesystem::CmdResult;

// ======================================================
// Tuning constants
// ======================================================

/// Directories that should never be indexed. Matches the rules used by
/// `search.rs` so the two stay consistent.
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", "__pycache__",
    ".next", ".nuxt", ".cache", "vendor", ".venv", "venv", ".lorica",
];

/// File extensions we know carry no useful text content.
const BINARY_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "svg", "webp",
    "woff", "woff2", "ttf", "otf", "eot",
    "zip", "tar", "gz", "rar", "7z",
    "exe", "dll", "so", "dylib", "bin",
    "pdf", "doc", "docx", "xls", "xlsx",
    "mp3", "mp4", "avi", "mov", "wav",
    "lock", "sum",
];

/// Lines per chunk. 50 is a sweet spot — long enough for semantic
/// meaning, short enough that similarity scores aren't washed out.
const CHUNK_LINES: usize = 50;

/// Overlap between consecutive chunks. Lets matches that straddle a
/// chunk boundary still show up.
const CHUNK_OVERLAP: usize = 10;

/// Skip files bigger than this. Huge files (minified JS, generated code)
/// swamp the index and rarely contain text the user would search for.
const MAX_FILE_BYTES: u64 = 512 * 1024;

/// Current on-disk format version. Bump when the struct shape changes so
/// old indexes are rebuilt instead of mis-read.
const INDEX_VERSION: u32 = 1;

/// Chars per chunk text sent to the embedder — a safety cap so a 50-line
/// chunk full of minified code doesn't blow past the model's context.
const MAX_CHUNK_CHARS: usize = 4000;

// ======================================================
// Types
// ======================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chunk {
    pub path: String,       // absolute path on disk
    pub relative: String,   // relative to project root (display / dedup key)
    pub start_line: usize,  // 1-indexed, inclusive
    pub end_line: usize,    // 1-indexed, inclusive
    pub text: String,       // raw chunk content
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SemanticIndex {
    pub version: u32,
    pub model: String,
    pub dim: usize,
    pub built_at: String,   // ISO 8601 UTC
    pub chunks: Vec<Chunk>,
    pub vectors: Vec<Vec<f32>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SemanticHit {
    pub path: String,
    pub relative: String,
    pub start_line: usize,
    pub end_line: usize,
    pub snippet: String,   // first ~6 lines of the chunk for preview
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SemanticIndexStatus {
    pub exists: bool,
    pub built_at: Option<String>,
    pub chunks: usize,
    pub dim: usize,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndexBuildReport {
    pub chunks: usize,
    pub files: usize,
    pub duration_ms: u128,
    pub model: String,
    pub dim: usize,
}

// ======================================================
// Helpers
// ======================================================

fn should_skip_dir(name: &str) -> bool {
    name.starts_with('.') || SKIP_DIRS.contains(&name)
}

fn is_binary(ext: &str) -> bool {
    BINARY_EXTS.contains(&ext.to_lowercase().as_str())
}

fn index_path(project_path: &str) -> PathBuf {
    Path::new(project_path).join(".lorica").join("semantic.bin")
}

/// Split a single file's content into line-windowed chunks. Empty files
/// produce zero chunks; tiny files (<10 lines) still produce one.
fn chunk_file(content: &str, path: &str, relative: &str) -> Vec<Chunk> {
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() { return Vec::new(); }

    let mut chunks = Vec::new();
    let mut start = 0usize;
    while start < lines.len() {
        let end = (start + CHUNK_LINES).min(lines.len());
        let mut text = lines[start..end].join("\n");
        if text.len() > MAX_CHUNK_CHARS {
            text.truncate(MAX_CHUNK_CHARS);
        }
        // Skip near-empty chunks (pure whitespace is noise for the embedder).
        if text.trim().len() >= 16 {
            chunks.push(Chunk {
                path: path.to_string(),
                relative: relative.to_string(),
                start_line: start + 1,
                end_line: end,
                text,
            });
        }
        if end >= lines.len() { break; }
        start = end.saturating_sub(CHUNK_OVERLAP);
        // Guard against zero-progress if CHUNK_LINES <= CHUNK_OVERLAP.
        if start == end - CHUNK_LINES.min(end) { break; }
    }
    chunks
}

/// Walk the project and collect every chunk eligible for indexing.
fn collect_chunks(project_path: &str) -> (Vec<Chunk>, usize) {
    let mut chunks = Vec::new();
    let mut files_seen = 0usize;

    for entry in WalkDir::new(project_path)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                let name = e.file_name().to_string_lossy();
                return !should_skip_dir(&name);
            }
            true
        })
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() { continue; }

        let path = entry.path();
        let ext = path.extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();
        if is_binary(&ext) { continue; }

        if let Ok(meta) = fs::metadata(path) {
            if meta.len() > MAX_FILE_BYTES { continue; }
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,    // probably binary masquerading as text
        };

        files_seen += 1;
        let full = path.to_string_lossy().to_string();
        let rel = pathdiff::diff_paths(path, project_path)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| full.clone());

        chunks.extend(chunk_file(&content, &full, &rel));
    }

    (chunks, files_seen)
}

fn init_model() -> Result<TextEmbedding, String> {
    TextEmbedding::try_new(
        InitOptions::new(EmbeddingModel::AllMiniLML6V2)
    ).map_err(|e| format!("Failed to load embedding model: {}", e))
}

/// L2-normalized → dot product == cosine similarity. fastembed already
/// normalizes its output, so we do too (defensive) and then take the dot.
fn cosine(a: &[f32], b: &[f32]) -> f32 {
    let n = a.len().min(b.len());
    let mut dot = 0.0f32;
    for i in 0..n { dot += a[i] * b[i]; }
    dot
}

/// Build a short snippet (first 6 non-empty lines, trimmed) for display.
fn make_snippet(chunk_text: &str) -> String {
    let mut out = String::new();
    let mut n = 0;
    for line in chunk_text.lines() {
        if line.trim().is_empty() { continue; }
        if n > 0 { out.push('\n'); }
        // Keep individual lines reasonable for list display.
        let trimmed: String = line.chars().take(180).collect();
        out.push_str(&trimmed);
        n += 1;
        if n >= 6 { break; }
    }
    out
}

// ======================================================
// Commands
// ======================================================

/// (Re)build the full semantic index for a project. Returns a small
/// report with chunk count / duration / model info. Overwrites any
/// previous index at `<project>/.lorica/semantic.bin`.
#[tauri::command]
pub fn cmd_semantic_index_project(project_path: String) -> CmdResult<IndexBuildReport> {
    let started = Instant::now();

    let (chunks, files_seen) = collect_chunks(&project_path);
    if chunks.is_empty() {
        return CmdResult::err("No indexable files found in project.");
    }

    let mut model = match init_model() {
        Ok(m) => m,
        Err(e) => return CmdResult::err(e),
    };

    // fastembed takes Vec<String> (or Vec<&str>); it does its own batching.
    let texts: Vec<String> = chunks.iter().map(|c| c.text.clone()).collect();
    let vectors = match model.embed(texts, None) {
        Ok(v) => v,
        Err(e) => return CmdResult::err(format!("Embedding failed: {}", e)),
    };

    let dim = vectors.first().map(|v| v.len()).unwrap_or(0);

    let index = SemanticIndex {
        version: INDEX_VERSION,
        model: "AllMiniLML6V2".to_string(),
        dim,
        built_at: Utc::now().to_rfc3339(),
        chunks,
        vectors,
    };

    // Persist.
    let out_path = index_path(&project_path);
    if let Some(parent) = out_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return CmdResult::err(format!("Cannot create .lorica dir: {}", e));
        }
    }
    let encoded = match bincode::serialize(&index) {
        Ok(b) => b,
        Err(e) => return CmdResult::err(format!("Serialize failed: {}", e)),
    };
    if let Err(e) = fs::write(&out_path, &encoded) {
        return CmdResult::err(format!("Cannot write index file: {}", e));
    }

    CmdResult::ok(IndexBuildReport {
        chunks: index.chunks.len(),
        files: files_seen,
        duration_ms: started.elapsed().as_millis(),
        model: index.model,
        dim: index.dim,
    })
}

/// Report whether a usable index exists on disk. Cheap — only reads the
/// metadata header. Lets the UI show "Build index" vs "Search" without
/// paying the load cost.
#[tauri::command]
pub fn cmd_semantic_index_status(project_path: String) -> CmdResult<SemanticIndexStatus> {
    let p = index_path(&project_path);
    if !p.exists() {
        return CmdResult::ok(SemanticIndexStatus {
            exists: false,
            built_at: None,
            chunks: 0,
            dim: 0,
            model: String::new(),
        });
    }

    let bytes = match fs::read(&p) {
        Ok(b) => b,
        Err(e) => return CmdResult::err(format!("Cannot read index: {}", e)),
    };
    let index: SemanticIndex = match bincode::deserialize(&bytes) {
        Ok(i) => i,
        Err(_) => {
            // Corrupt or schema-mismatched — report as absent so the UI
            // offers to rebuild.
            return CmdResult::ok(SemanticIndexStatus {
                exists: false,
                built_at: None,
                chunks: 0,
                dim: 0,
                model: String::new(),
            });
        }
    };

    if index.version != INDEX_VERSION {
        return CmdResult::ok(SemanticIndexStatus {
            exists: false,
            built_at: Some(index.built_at),
            chunks: index.chunks.len(),
            dim: index.dim,
            model: index.model,
        });
    }

    CmdResult::ok(SemanticIndexStatus {
        exists: true,
        built_at: Some(index.built_at),
        chunks: index.chunks.len(),
        dim: index.dim,
        model: index.model,
    })
}

/// Run a semantic query against the on-disk index. Returns top-K hits
/// sorted by cosine similarity, highest first.
#[tauri::command]
pub fn cmd_semantic_search(
    project_path: String,
    query: String,
    top_k: Option<usize>,
) -> CmdResult<Vec<SemanticHit>> {
    if query.trim().is_empty() {
        return CmdResult::ok(Vec::new());
    }
    let k = top_k.unwrap_or(20).max(1).min(200);

    let p = index_path(&project_path);
    if !p.exists() {
        return CmdResult::err("No semantic index yet — click \"Build index\" first.");
    }
    let bytes = match fs::read(&p) {
        Ok(b) => b,
        Err(e) => return CmdResult::err(format!("Cannot read index: {}", e)),
    };
    let index: SemanticIndex = match bincode::deserialize(&bytes) {
        Ok(i) => i,
        Err(e) => return CmdResult::err(format!(
            "Index file is corrupt or outdated — rebuild it. ({})", e
        )),
    };
    if index.version != INDEX_VERSION {
        return CmdResult::err("Index is from an older version — rebuild it.");
    }

    let mut model = match init_model() {
        Ok(m) => m,
        Err(e) => return CmdResult::err(e),
    };
    let mut qvec = match model.embed(vec![query.clone()], None) {
        Ok(v) => v,
        Err(e) => return CmdResult::err(format!("Query embedding failed: {}", e)),
    };
    let qv = match qvec.pop() {
        Some(v) => v,
        None => return CmdResult::err("Empty query embedding."),
    };

    // Score every chunk. Brute force is fine up to ~50k chunks.
    let mut scored: Vec<(usize, f32)> = index.vectors.iter()
        .enumerate()
        .map(|(i, v)| (i, cosine(&qv, v)))
        .collect();

    // Partial sort — we only need top-K.
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(k);

    let hits = scored.into_iter().map(|(i, score)| {
        let c = &index.chunks[i];
        SemanticHit {
            path: c.path.clone(),
            relative: c.relative.clone(),
            start_line: c.start_line,
            end_line: c.end_line,
            snippet: make_snippet(&c.text),
            score,
        }
    }).collect();

    CmdResult::ok(hits)
}

/// Delete the on-disk index. Mostly useful for "reset" / troubleshooting.
#[tauri::command]
pub fn cmd_semantic_index_clear(project_path: String) -> CmdResult<bool> {
    let p = index_path(&project_path);
    if p.exists() {
        if let Err(e) = fs::remove_file(&p) {
            return CmdResult::err(format!("Cannot delete index: {}", e));
        }
    }
    CmdResult::ok(true)
}
