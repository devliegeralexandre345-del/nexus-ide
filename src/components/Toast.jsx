import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  warning: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  error: 'text-red-400 border-red-400/30 bg-red-400/5',
  info: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
};

const GLOW = {
  success: '0 0 20px rgba(52,211,153,0.15)',
  warning: '0 0 20px rgba(251,191,36,0.15)',
  error: '0 0 20px rgba(248,113,113,0.15)',
  info: '0 0 20px rgba(96,165,250,0.15)',
};

function Toast({ toast, onDismiss }) {
  const type = toast.type || 'info';
  const Icon = ICONS[type];
  const duration = toast.duration ?? 3000;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border backdrop-blur-xl ${COLORS[type]} animate-slideInRight`}
      style={{ boxShadow: GLOW[type] }}
    >
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-[11px] font-semibold mb-0.5">{toast.title}</div>
        )}
        <div className="text-[10px] opacity-80">{toast.message}</div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, dispatch }) {
  const handleDismiss = (id) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-[999] flex flex-col gap-2 w-[300px] pointer-events-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
