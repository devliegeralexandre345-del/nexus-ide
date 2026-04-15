import React, { useState, useEffect } from 'react';
import { ClipboardList, X, RefreshCw, Shield, ShieldAlert, FolderOpen, Save, Lock, Unlock } from 'lucide-react';

const ACTION_ICONS = {
  VAULT_INIT: Shield,
  VAULT_UNLOCK: Unlock,
  VAULT_UNLOCK_FAIL: ShieldAlert,
  VAULT_LOCK: Lock,
  AUTO_LOCK: Lock,
  SECRET_ADD: Shield,
  SECRET_DELETE: Shield,
  SECRET_SCAN_ALERT: ShieldAlert,
  PROJECT_OPEN: FolderOpen,
  FILE_SAVE: Save,
};

const ACTION_COLORS = {
  VAULT_UNLOCK_FAIL: 'text-lorica-danger',
  SECRET_SCAN_ALERT: 'text-lorica-warning',
  AUTO_LOCK: 'text-lorica-warning',
};

export default function AuditLog({ dispatch }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await window.lorica.security.getAuditLog();
    if (result.success) setEntries(result.data.reverse());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showAuditLog', value: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
      <div className="w-[560px] max-h-[80vh] bg-lorica-panel border border-lorica-border rounded-xl shadow-2xl flex flex-col animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-lorica-border">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-lorica-accent" />
            <span className="text-sm font-semibold text-lorica-text">Audit Log</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lorica-panel text-lorica-textDim">{entries.length} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-lorica-textDim hover:text-lorica-accent"><RefreshCw size={14} /></button>
            <button onClick={close} className="text-lorica-textDim hover:text-lorica-text"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-lorica-textDim text-xs">No audit entries yet</div>
          ) : (
            entries.map((entry, i) => {
              const Icon = ACTION_ICONS[entry.action] || ClipboardList;
              const color = ACTION_COLORS[entry.action] || 'text-lorica-textDim';
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-2 border-b border-lorica-border/30 hover:bg-lorica-panel/50">
                  <Icon size={12} className={`mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-medium ${color}`}>{entry.action}</span>
                      <span className="text-[10px] text-lorica-textDim">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.detail && (
                      <div className="text-[10px] text-lorica-textDim truncate mt-0.5">{entry.detail}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

