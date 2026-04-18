import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

/**
 * Auto-reindex the semantic search index when files change on disk.
 *
 * Flow:
 *   1. Probe `semanticIndexStatus` for the current project.
 *      - If an index already exists → start the backend watcher and
 *        listen for `fs:change`.
 *      - If not → stay idle until the user manually builds an index.
 *   2. When relevant changes arrive (filters out `.git/`, `node_modules/`,
 *      `.lorica/` itself, build output, editor swap files, etc.), debounce
 *      2 s then call `semanticIndex(path, false)` — incremental mtime-based
 *      reindex, typically hundreds of ms.
 *   3. Listens for a `lorica:semantic-index-changed` DOM event so other
 *      subsystems (GlobalSearch's manual Build/Clear button) can flip this
 *      hook on or off without prop-drilling.
 *
 * Silent by default. Exposes `status` ('idle' | 'debouncing' | 'indexing')
 * and `lastReport` for optional UI badges.
 *
 * @param {string | null} projectPath
 * @param {boolean} [featureEnabled=true] — master switch; caller can disable.
 */
export function useSemanticAutoReindex(projectPath, featureEnabled = true) {
  const [status, setStatus] = useState('idle');
  const [indexExists, setIndexExists] = useState(false);
  const [lastReport, setLastReport] = useState(null);

  const debounceRef = useRef(null);
  const indexingRef = useRef(false);
  const pendingRef = useRef(false);

  // Probe index existence whenever the project changes or a manual build/
  // clear happens elsewhere.
  useEffect(() => {
    if (!featureEnabled || !projectPath) {
      setIndexExists(false);
      return;
    }
    let alive = true;

    const probe = async () => {
      try {
        const res = await window.lorica?.search?.semanticIndexStatus(projectPath);
        const data = res?.data || res;
        if (!alive) return;
        setIndexExists(!!(data && data.exists));
      } catch (_) {
        if (alive) setIndexExists(false);
      }
    };

    probe();
    const onChanged = () => probe();
    window.addEventListener('lorica:semantic-index-changed', onChanged);
    return () => {
      alive = false;
      window.removeEventListener('lorica:semantic-index-changed', onChanged);
    };
  }, [projectPath, featureEnabled]);

  // Start watching + subscribing only once we know an index exists.
  useEffect(() => {
    if (!featureEnabled || !projectPath || !indexExists) {
      setStatus('idle');
      return;
    }

    let disposed = false;
    let unlisten = null;

    const shouldIgnore = (absPath) => {
      if (!absPath || typeof absPath !== 'string') return true;
      const p = absPath.replace(/\\/g, '/');
      if (
        p.includes('/.lorica/') ||
        p.includes('/.git/') ||
        p.includes('/node_modules/') ||
        p.includes('/target/') ||
        p.includes('/dist/') ||
        p.includes('/build/') ||
        p.includes('/.next/') ||
        p.includes('/.cache/') ||
        p.includes('/.idea/') ||
        p.includes('/.vscode/')
      ) return true;
      const base = p.split('/').pop() || '';
      if (base.endsWith('.swp') || base.endsWith('.swo') || base.endsWith('~')) return true;
      if (base === '.DS_Store' || base === 'Thumbs.db') return true;
      return false;
    };

    const runIndex = async () => {
      if (disposed) return;
      if (indexingRef.current) {
        pendingRef.current = true;
        return;
      }
      indexingRef.current = true;
      setStatus('indexing');
      try {
        const res = await window.lorica?.search?.semanticIndex(projectPath, false);
        if (!disposed && res) setLastReport(res.data || res);
      } catch (err) {
        console.warn('[auto-reindex] failed:', err);
      } finally {
        indexingRef.current = false;
        if (!disposed) {
          if (pendingRef.current) {
            pendingRef.current = false;
            scheduleDebounced();
          } else {
            setStatus('idle');
          }
        }
      }
    };

    const scheduleDebounced = () => {
      if (disposed) return;
      setStatus('debouncing');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runIndex();
      }, 2000);
    };

    (async () => {
      try {
        await window.lorica?.fs?.watchProject(projectPath);
      } catch (err) {
        console.warn('[auto-reindex] watchProject failed:', err);
      }

      try {
        unlisten = await listen('fs:change', (evt) => {
          const payload = evt?.payload;
          if (!payload) return;
          const paths = Array.isArray(payload.paths) ? payload.paths : [];
          const relevant = paths.some((p) => !shouldIgnore(p));
          if (!relevant) return;
          scheduleDebounced();
        });
      } catch (err) {
        console.warn('[auto-reindex] listen failed:', err);
      }
    })();

    return () => {
      disposed = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (typeof unlisten === 'function') {
        try { unlisten(); } catch (_) { /* ignore */ }
      }
      setStatus('idle');
    };
  }, [projectPath, featureEnabled, indexExists]);

  return { status, lastReport, indexExists };
}
