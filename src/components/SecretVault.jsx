import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Eye, EyeOff, X, Copy, Check } from 'lucide-react';

export default function SecretVault({ state, dispatch, security }) {
  const [secrets, setSecrets] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [secretValues, setSecretValues] = useState({});
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    const result = await window.lorica.security.listSecrets();
    if (result.success) setSecrets(result.data);
  };

  const addSecret = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    await window.lorica.security.addSecret(newKey.trim(), newValue.trim());
    setNewKey('');
    setNewValue('');
    loadSecrets();
  };

  const deleteSecret = async (key) => {
    await window.lorica.security.deleteSecret(key);
    loadSecrets();
  };

  const toggleVisible = async (key) => {
    if (visibleKeys[key]) {
      setVisibleKeys((prev) => ({ ...prev, [key]: false }));
    } else {
      const result = await window.lorica.security.getSecret(key);
      if (result.success) {
        setSecretValues((prev) => ({ ...prev, [key]: result.data }));
        setVisibleKeys((prev) => ({ ...prev, [key]: true }));
      }
    }
  };

  const copySecret = async (key) => {
    const result = await window.lorica.security.getSecret(key);
    if (result.success) {
      navigator.clipboard.writeText(result.data);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const close = () => dispatch({ type: 'SET_PANEL', panel: 'showSecretVault', value: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
      <div className="w-[520px] max-h-[80vh] bg-lorica-panel border border-lorica-border rounded-xl shadow-2xl flex flex-col animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-lorica-border">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-lorica-accent" />
            <span className="text-sm font-semibold text-lorica-text">Secret Vault</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lorica-accent/10 text-lorica-accent">AES-256-GCM</span>
          </div>
          <button onClick={close} className="text-lorica-textDim hover:text-lorica-text"><X size={16} /></button>
        </div>

        {!state.vaultUnlocked ? (
          <div className="p-8 text-center text-lorica-textDim text-sm">
            <Shield size={32} className="mx-auto mb-3 opacity-20" />
            <div>Vault is locked. Lock the IDE and re-enter your password to access secrets.</div>
          </div>
        ) : (
          <>
            {/* Add secret */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-lorica-border/50">
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key name"
                className="flex-1 bg-lorica-bg border border-lorica-border rounded px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent"
              />
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Secret value"
                type="password"
                className="flex-1 bg-lorica-bg border border-lorica-border rounded px-2 py-1.5 text-xs text-lorica-text outline-none focus:border-lorica-accent"
              />
              <button
                onClick={addSecret}
                disabled={!newKey.trim() || !newValue.trim()}
                className="p-1.5 bg-lorica-accent text-lorica-bg rounded hover:bg-lorica-accent/80 disabled:opacity-30 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Secrets list */}
            <div className="flex-1 overflow-y-auto">
              {secrets.length === 0 ? (
                <div className="p-8 text-center text-lorica-textDim text-xs">No secrets stored yet</div>
              ) : (
                secrets.map((key) => (
                  <div key={key} className="flex items-center gap-2 px-4 py-2 border-b border-lorica-border/30 hover:bg-lorica-panel/50 group">
                    <span className="text-xs text-lorica-accent font-mono flex-1 truncate">{key}</span>
                    {visibleKeys[key] && (
                      <span className="text-xs text-lorica-textDim font-mono truncate max-w-[150px]">{secretValues[key]}</span>
                    )}
                    <button onClick={() => toggleVisible(key)} className="p-1 text-lorica-textDim hover:text-lorica-text opacity-0 group-hover:opacity-100 transition-all">
                      {visibleKeys[key] ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => copySecret(key)} className="p-1 text-lorica-textDim hover:text-lorica-accent opacity-0 group-hover:opacity-100 transition-all">
                      {copied === key ? <Check size={12} className="text-lorica-success" /> : <Copy size={12} />}
                    </button>
                    <button onClick={() => deleteSecret(key)} className="p-1 text-lorica-textDim hover:text-lorica-danger opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Security alerts */}
        {state.securityAlerts.length > 0 && (
          <div className="border-t border-lorica-danger/30 bg-lorica-danger/5 px-4 py-2">
            <div className="text-[10px] text-lorica-danger font-semibold mb-1">⚠ Secrets detected in code:</div>
            {state.securityAlerts.map((alert, i) => (
              <div key={i} className="text-[10px] text-lorica-danger/80">
                Line {alert.line}: {alert.type} — {alert.snippet}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

