// src/components/previews/SqlSchemaPreview.jsx
//
// Parses a SQL file for CREATE TABLE / ALTER TABLE / CREATE INDEX statements
// and renders a "database tree" : tables as cards with their columns, primary
// keys, foreign keys, indexes. Works on MySQL / Postgres / SQLite / MSSQL
// dialects (best-effort — intended as a visual aid, not a full SQL parser).

import React, { useMemo, useState } from 'react';
import {
  Database, Table, Key, Link2, Search, Hash, ChevronDown, ChevronRight,
  FileCode, AlertCircle,
} from 'lucide-react';

// ── Parser ──────────────────────────────────────────────────────────────────
// Regex-based. Not a full parser, but handles the ~90% common cases.

function stripComments(sql) {
  return sql
    .replace(/--[^\n]*/g, '')          // line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
}

function unquote(name) {
  if (!name) return name;
  return name.replace(/^[`"\[]|[`"\]]$/g, '');
}

function splitColumnDefs(body) {
  // Split top-level commas (ignore commas inside parens)
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
    } else buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function parseTable(defText) {
  // defText is what's inside the outermost parens of CREATE TABLE
  const columns = [];
  const pkCols = [];
  const fks = [];
  const indexes = [];
  const rawConstraints = [];

  for (const line of splitColumnDefs(defText)) {
    const upper = line.toUpperCase();

    // Table-level PRIMARY KEY
    const pkMatch = line.match(/^(?:CONSTRAINT\s+[`"\[\]\w]+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      pkMatch[1].split(',').forEach((c) => pkCols.push(unquote(c.trim())));
      continue;
    }

    // Table-level FOREIGN KEY
    const fkMatch = line.match(/^(?:CONSTRAINT\s+[`"\[\]\w]+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"\[\]\w.]+)\s*\(([^)]+)\)/i);
    if (fkMatch) {
      fks.push({
        from: fkMatch[1].split(',').map((c) => unquote(c.trim())),
        table: unquote(fkMatch[2]),
        to: fkMatch[3].split(',').map((c) => unquote(c.trim())),
      });
      continue;
    }

    // UNIQUE / INDEX / KEY
    const idxMatch = line.match(/^(?:UNIQUE\s+)?(?:KEY|INDEX)\s+[`"\[\]\w]*\s*\(([^)]+)\)/i);
    if (idxMatch) {
      indexes.push({
        unique: /^UNIQUE/i.test(line),
        columns: idxMatch[1].split(',').map((c) => unquote(c.trim())),
      });
      continue;
    }

    // Skip pure constraint lines we don't parse
    if (upper.startsWith('CHECK') || upper.startsWith('CONSTRAINT')) {
      rawConstraints.push(line);
      continue;
    }

    // Column: <name> <type> <modifiers...>
    const colMatch = line.match(/^([`"\[\]\w]+)\s+([^\s,(]+(?:\([^)]*\))?)\s*(.*)$/);
    if (colMatch) {
      const name = unquote(colMatch[1]);
      const type = colMatch[2];
      const rest = colMatch[3].toUpperCase();
      const notNull = /NOT\s+NULL/.test(rest);
      const isPk = /PRIMARY\s+KEY/.test(rest);
      const isUnique = /UNIQUE/.test(rest) && !/UNIQUE\s+KEY/.test(rest);
      const isAutoIncr = /AUTO_INCREMENT|SERIAL|IDENTITY|AUTOINCREMENT/.test(rest);
      let defaultVal = null;
      const defMatch = colMatch[3].match(/DEFAULT\s+('[^']*'|"[^"]*"|[-\w.]+)/i);
      if (defMatch) defaultVal = defMatch[1];

      // Inline REFERENCES
      const inlineFk = colMatch[3].match(/REFERENCES\s+([`"\[\]\w.]+)\s*\(([^)]+)\)/i);
      if (inlineFk) {
        fks.push({
          from: [name],
          table: unquote(inlineFk[1]),
          to: [unquote(inlineFk[2].trim())],
        });
      }

      columns.push({ name, type, notNull, isPk, isUnique, isAutoIncr, default: defaultVal });
      if (isPk) pkCols.push(name);
    }
  }

  return { columns, pkCols, fks, indexes, rawConstraints };
}

function parseSql(sql) {
  const clean = stripComments(sql);
  const tables = {};
  const errors = [];

  // CREATE TABLE [IF NOT EXISTS] <name> ( ... )
  const tableRe = /CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[\]\w.]+)\s*\(([\s\S]*?)\)\s*(?:ENGINE|DEFAULT|CHARSET|COLLATE|WITH|;|$)/gi;
  let m;
  while ((m = tableRe.exec(clean)) !== null) {
    const name = unquote(m[1].split('.').pop());
    try {
      const parsed = parseTable(m[2]);
      tables[name] = { name, ...parsed };
    } catch (e) {
      errors.push(`Parsing error in table ${name}: ${e.message}`);
    }
  }

  // ALTER TABLE <name> ADD CONSTRAINT ... FOREIGN KEY ...
  const alterFkRe = /ALTER\s+TABLE\s+([`"\[\]\w.]+)[\s\S]*?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"\[\]\w.]+)\s*\(([^)]+)\)/gi;
  while ((m = alterFkRe.exec(clean)) !== null) {
    const tableName = unquote(m[1].split('.').pop());
    if (!tables[tableName]) continue;
    tables[tableName].fks.push({
      from: m[2].split(',').map((c) => unquote(c.trim())),
      table: unquote(m[3].split('.').pop()),
      to: m[4].split(',').map((c) => unquote(c.trim())),
    });
  }

  // CREATE INDEX <name> ON <table> ( ... )
  const idxRe = /CREATE\s+(UNIQUE\s+)?INDEX\s+[`"\[\]\w]+\s+ON\s+([`"\[\]\w.]+)\s*\(([^)]+)\)/gi;
  while ((m = idxRe.exec(clean)) !== null) {
    const tableName = unquote(m[2].split('.').pop());
    if (!tables[tableName]) continue;
    tables[tableName].indexes.push({
      unique: !!m[1],
      columns: m[3].split(',').map((c) => unquote(c.trim())),
    });
  }

  return { tables: Object.values(tables), errors };
}

// ── UI ──────────────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const u = (type || '').toUpperCase();
  let color = 'text-lorica-textDim';
  if (/INT|SERIAL|NUMERIC|DECIMAL|FLOAT|DOUBLE|REAL/.test(u)) color = 'text-cyan-400';
  else if (/CHAR|TEXT|CLOB|STRING/.test(u)) color = 'text-green-400';
  else if (/DATE|TIME/.test(u)) color = 'text-orange-400';
  else if (/BOOL/.test(u)) color = 'text-pink-400';
  else if (/BLOB|BINARY|BYTE/.test(u)) color = 'text-yellow-400';
  else if (/JSON|UUID|ENUM/.test(u)) color = 'text-purple-400';
  return <span className={`font-mono text-[10px] ${color}`}>{type}</span>;
}

function TableCard({ table, allTableNames, onJumpTo }) {
  const [open, setOpen] = useState(true);
  const pkSet = new Set(table.pkCols);
  const fkBySource = {};
  for (const fk of table.fks) {
    for (const col of fk.from) {
      fkBySource[col] = fk;
    }
  }

  return (
    <div id={`sql-table-${table.name}`} className="bg-lorica-panel border border-lorica-border rounded-lg overflow-hidden mb-3 shadow">
      {/* Header */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-lorica-accent/10 to-transparent border-b border-lorica-border cursor-pointer hover:from-lorica-accent/20"
      >
        {open ? <ChevronDown size={12} className="text-lorica-textDim" /> : <ChevronRight size={12} className="text-lorica-textDim" />}
        <Table size={12} className="text-lorica-accent" />
        <span className="font-semibold text-xs text-lorica-text">{table.name}</span>
        <span className="text-[10px] text-lorica-textDim">
          {table.columns.length} col{table.columns.length > 1 ? 's' : ''}
          {table.fks.length > 0 && ` · ${table.fks.length} FK${table.fks.length > 1 ? 's' : ''}`}
          {table.indexes.length > 0 && ` · ${table.indexes.length} idx`}
        </span>
      </div>

      {open && (
        <>
          {/* Columns */}
          <div className="divide-y divide-lorica-border/50">
            {table.columns.map((col) => {
              const fk = fkBySource[col.name];
              const isPk = pkSet.has(col.name);
              return (
                <div key={col.name} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-lorica-bg/40">
                  <div className="w-4 shrink-0 flex items-center justify-center">
                    {isPk && <Key size={10} className="text-yellow-400" title="Primary key" />}
                    {!isPk && fk && <Link2 size={10} className="text-blue-400" title={`FK → ${fk.table}.${fk.to.join(',')}`} />}
                    {!isPk && !fk && col.isUnique && <Hash size={10} className="text-purple-400" title="Unique" />}
                  </div>
                  <span className={`font-mono font-semibold flex-1 min-w-0 truncate ${isPk ? 'text-yellow-300' : 'text-lorica-text'}`}>
                    {col.name}
                  </span>
                  <TypeBadge type={col.type} />
                  <div className="flex gap-1 shrink-0 text-[9px]">
                    {col.notNull && <span className="px-1 rounded bg-red-900/30 text-red-300">NOT NULL</span>}
                    {col.isAutoIncr && <span className="px-1 rounded bg-cyan-900/30 text-cyan-300">AUTO</span>}
                    {col.default !== null && <span className="px-1 rounded bg-lorica-bg text-lorica-textDim">= {col.default}</span>}
                  </div>
                  {fk && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onJumpTo(fk.table); }}
                      className={`text-[9px] font-mono underline-offset-2 ${
                        allTableNames.has(fk.table)
                          ? 'text-blue-400 hover:underline cursor-pointer'
                          : 'text-lorica-textDim/60 cursor-default'
                      }`}
                      title={`→ ${fk.table}.${fk.to.join(',')}`}
                    >
                      → {fk.table}.{fk.to.join(',')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Indexes */}
          {table.indexes.length > 0 && (
            <div className="px-3 py-2 border-t border-lorica-border bg-lorica-bg/30">
              <div className="text-[9px] uppercase tracking-widest text-lorica-textDim mb-1">Indexes</div>
              {table.indexes.map((idx, i) => (
                <div key={i} className="text-[10px] font-mono text-lorica-textDim">
                  {idx.unique && <span className="text-purple-400">UNIQUE </span>}
                  ({idx.columns.join(', ')})
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SqlSchemaPreview({ file }) {
  const { tables, errors } = useMemo(
    () => parseSql(file?.content || ''),
    [file?.content]
  );
  const [filter, setFilter] = useState('');

  const allTableNames = useMemo(() => new Set(tables.map((t) => t.name)), [tables]);

  const visibleTables = useMemo(() => {
    if (!filter.trim()) return tables;
    const f = filter.trim().toLowerCase();
    return tables.filter((t) =>
      t.name.toLowerCase().includes(f) ||
      t.columns.some((c) => c.name.toLowerCase().includes(f))
    );
  }, [tables, filter]);

  const jumpTo = (tableName) => {
    const el = document.getElementById(`sql-table-${tableName}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Stats
  const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
  const totalFks = tables.reduce((sum, t) => sum + t.fks.length, 0);

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-lorica-border bg-lorica-surface/30 shrink-0">
        <Database size={14} className="text-lorica-accent" />
        <span className="text-xs font-semibold text-lorica-text">Schema</span>
        <span className="text-[10px] text-lorica-textDim">
          {tables.length} table{tables.length > 1 ? 's' : ''} · {totalColumns} col · {totalFks} FK
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-lorica-bg rounded border border-lorica-border px-2 py-0.5">
          <Search size={11} className="text-lorica-textDim" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer tables / colonnes…"
            className="bg-transparent text-[11px] text-lorica-text outline-none w-48 placeholder:text-lorica-textDim/50"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-3">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileCode size={32} className="text-lorica-textDim/30 mb-2" />
            <div className="text-xs text-lorica-textDim">Aucune table trouvée</div>
            <div className="text-[10px] text-lorica-textDim/60 mt-1">
              Le parseur cherche des instructions <code className="font-mono">CREATE TABLE</code>.
            </div>
          </div>
        ) : visibleTables.length === 0 ? (
          <div className="text-xs text-lorica-textDim text-center mt-8">
            Aucun résultat pour "{filter}"
          </div>
        ) : (
          <>
            {/* Foreign-key overview */}
            {totalFks > 0 && (
              <div className="mb-3 p-2 rounded border border-lorica-border bg-lorica-panel/40">
                <div className="text-[9px] uppercase tracking-widest text-lorica-textDim mb-1 flex items-center gap-1">
                  <Link2 size={9} /> Relations
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono">
                  {tables.flatMap((t) =>
                    t.fks.map((fk, i) => (
                      <span key={`${t.name}-${i}`} className="text-lorica-text">
                        <button
                          onClick={() => jumpTo(t.name)}
                          className="text-lorica-accent hover:underline"
                        >
                          {t.name}
                        </button>
                        <span className="text-lorica-textDim">.{fk.from.join(',')} →</span>{' '}
                        <button
                          onClick={() => jumpTo(fk.table)}
                          className={allTableNames.has(fk.table) ? 'text-blue-400 hover:underline' : 'text-lorica-textDim/60'}
                        >
                          {fk.table}
                        </button>
                        <span className="text-lorica-textDim">.{fk.to.join(',')}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {visibleTables.map((table) => (
              <TableCard
                key={table.name}
                table={table}
                allTableNames={allTableNames}
                onJumpTo={jumpTo}
              />
            ))}
          </>
        )}

        {errors.length > 0 && (
          <div className="mt-3 p-2 rounded border border-yellow-700/40 bg-yellow-900/10 text-[10px] text-yellow-300/80">
            <div className="flex items-center gap-1 font-semibold mb-1">
              <AlertCircle size={10} /> Parsing warnings
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
