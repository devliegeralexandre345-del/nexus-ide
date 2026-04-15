import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, RefreshCw, FilePlus, FolderPlus, Trash2, Pencil, X, Check } from 'lucide-react';
import { getFileIcon } from '../utils/languages';

// Inline name input component
function InlineInput({ defaultValue, onConfirm, onCancel, placeholder }) {
  const ref = useRef(null);
  const [value, setValue] = useState(defaultValue || '');

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex items-center gap-1 px-1">
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (value.trim()) onConfirm(value.trim()); else onCancel(); }}
        placeholder={placeholder}
        className="flex-1 bg-lorica-bg border border-lorica-accent rounded px-1.5 py-0.5 text-[11px] text-lorica-text outline-none"
      />
    </div>
  );
}

function TreeNode({ node, depth, onFileClick, onRefresh, projectPath, fs, dispatch }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [creating, setCreating] = useState(null); // 'file' | 'dir' | null
  const [renaming, setRenaming] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const handleClick = () => {
    if (node.isDirectory) {
      setExpanded(!expanded);
    } else {
      onFileClick(node.path);
    }
  };

  const handleCreate = async (name, type) => {
    const dirPath = node.isDirectory ? node.path : node.path.replace(/[/\\][^/\\]+$/, '');
    if (type === 'file') {
      const path = await fs.createNewFile(dirPath, name);
      if (path) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Created ${name}`, duration: 1500 } });
        onRefresh();
        onFileClick(path);
      }
    } else {
      const path = await fs.createNewDir(dirPath, name);
      if (path) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Created folder ${name}`, duration: 1500 } });
        onRefresh();
      }
    }
    setCreating(null);
  };

  const handleRename = async (newName) => {
    const parentDir = node.path.replace(/[/\\][^/\\]+$/, '');
    const newPath = `${parentDir}/${newName}`;
    const ok = await fs.renamePath(node.path, newPath);
    if (ok) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Renamed to ${newName}`, duration: 1500 } });
      onRefresh();
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    const ok = await fs.deletePath(node.path);
    if (ok) {
      dispatch({ type: 'ADD_TOAST', toast: { type: 'info', message: `Deleted ${node.name}`, duration: 1500 } });
      onRefresh();
    }
    setShowContext(false);
  };

  return (
    <div className="animate-slideIn">
      <div
        className="flex items-center gap-1.5 pr-2 py-0.5 text-xs hover:bg-lorica-panel/60 transition-colors group relative"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onContextMenu={(e) => { e.preventDefault(); setShowContext(!showContext); }}
      >
        {/* Expand arrow or spacer */}
        <button onClick={handleClick} className="flex items-center gap-1.5 flex-1 min-w-0 truncate">
          {node.isDirectory ? (
            expanded ? <ChevronDown size={12} className="text-lorica-textDim flex-shrink-0" /> : <ChevronRight size={12} className="text-lorica-textDim flex-shrink-0" />
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}

          {renaming ? null : (
            <>
              <span className="flex-shrink-0 text-[11px]">{getFileIcon(node.extension, node.isDirectory)}</span>
              <span className={`truncate ${node.isDirectory ? 'text-lorica-text font-medium' : 'text-lorica-textDim group-hover:text-lorica-text'}`}>
                {node.name}
              </span>
            </>
          )}
        </button>

        {/* Rename inline */}
        {renaming && (
          <div className="flex-1">
            <InlineInput
              defaultValue={node.name}
              onConfirm={handleRename}
              onCancel={() => setRenaming(false)}
              placeholder="New name..."
            />
          </div>
        )}

        {/* Hover actions */}
        {!renaming && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
            {node.isDirectory && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setExpanded(true); setCreating('file'); }} className="p-0.5 text-lorica-textDim hover:text-lorica-accent rounded" title="New File">
                  <FilePlus size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setExpanded(true); setCreating('dir'); }} className="p-0.5 text-lorica-textDim hover:text-green-400 rounded" title="New Folder">
                  <FolderPlus size={12} />
                </button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); setRenaming(true); }} className="p-0.5 text-lorica-textDim hover:text-amber-400 rounded" title="Rename">
              <Pencil size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="p-0.5 text-lorica-textDim hover:text-red-400 rounded" title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {node.isDirectory && expanded && (
        <div>
          {/* Inline creation input */}
          {creating && (
            <div style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }} className="py-0.5">
              <InlineInput
                placeholder={creating === 'file' ? 'filename.ext' : 'folder name'}
                onConfirm={(name) => handleCreate(name, creating)}
                onCancel={() => setCreating(null)}
              />
            </div>
          )}
          {node.children && node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onRefresh={onRefresh}
              projectPath={projectPath}
              fs={fs}
              dispatch={dispatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ tree, projectPath, onFileClick, onRefresh, dispatch, fs }) {
  const [creatingRoot, setCreatingRoot] = useState(null);

  const handleRootCreate = async (name, type) => {
    if (!projectPath || !fs) return;
    if (type === 'file') {
      const path = await fs.createNewFile(projectPath, name);
      if (path) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Created ${name}` } });
        onRefresh();
        onFileClick(path);
      }
    } else {
      const path = await fs.createNewDir(projectPath, name);
      if (path) {
        dispatch({ type: 'ADD_TOAST', toast: { type: 'success', message: `Created folder ${name}` } });
        onRefresh();
      }
    }
    setCreatingRoot(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lorica-border">
        <span className="text-[10px] uppercase tracking-widest text-lorica-textDim font-semibold">Explorer</span>
        <div className="flex items-center gap-0.5">
          {projectPath && fs && (
            <>
              <button onClick={() => setCreatingRoot('file')} className="p-1 text-lorica-textDim hover:text-lorica-accent transition-colors rounded" title="New File">
                <FilePlus size={13} />
              </button>
              <button onClick={() => setCreatingRoot('dir')} className="p-1 text-lorica-textDim hover:text-green-400 transition-colors rounded" title="New Folder">
                <FolderPlus size={13} />
              </button>
            </>
          )}
          <button onClick={onRefresh} className="p-1 text-lorica-textDim hover:text-lorica-accent transition-colors rounded" title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Project name */}
      {projectPath && (
        <div className="px-3 py-1.5 text-[10px] text-lorica-accent font-mono truncate border-b border-lorica-border/50">
          {projectPath.split(/[/\\]/).pop()}
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Root creation input */}
        {creatingRoot && (
          <div className="px-2 py-1">
            <InlineInput
              placeholder={creatingRoot === 'file' ? 'filename.ext' : 'folder name'}
              onConfirm={(name) => handleRootCreate(name, creatingRoot)}
              onCancel={() => setCreatingRoot(null)}
            />
          </div>
        )}

        {tree.length > 0 ? (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              onFileClick={onFileClick}
              onRefresh={onRefresh}
              projectPath={projectPath}
              fs={fs}
              dispatch={dispatch}
            />
          ))
        ) : (
          <div className="px-3 py-8 text-center text-lorica-textDim text-xs">
            <div className="mb-2 opacity-40 text-2xl">📁</div>
            <div>No folder open</div>
            <div className="text-[10px] mt-1 opacity-60">File → Open Folder</div>
          </div>
        )}
      </div>
    </div>
  );
}
