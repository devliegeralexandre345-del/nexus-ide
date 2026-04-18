// Lorica — Tauri Entry Point
// The bridge must load first to create window.lorica
window.global = window;

import './loricaBridge';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// --------------------------------------------------------------------
// Suppress noisy unhandled rejections coming from Tauri internals.
//
// `@tauri-apps/plugin-http` leaks a "The resource id N is invalid." error
// when a fetch is aborted while its response body is still being read
// (e.g. the inline-AI completion cancels its request on every keystroke).
// Those errors are harmless — the request is legitimately cancelled —
// but webpack-dev-server's overlay treats them as unhandled and plasters
// the screen with a red modal. Swallow them specifically, log elsewhere.
// --------------------------------------------------------------------
function isBenignTauriAbort(reason) {
  const msg = reason?.message || (typeof reason === 'string' ? reason : '');
  return (
    /resource id \d+ is invalid/i.test(msg) ||
    reason?.name === 'AbortError'
  );
}

window.addEventListener('unhandledrejection', (ev) => {
  if (isBenignTauriAbort(ev.reason)) {
    ev.preventDefault();
    // eslint-disable-next-line no-console
    console.debug('[lorica] swallowed benign async cancel:', ev.reason?.message || ev.reason);
  }
});
window.addEventListener('error', (ev) => {
  if (isBenignTauriAbort(ev.error)) {
    ev.preventDefault();
    // eslint-disable-next-line no-console
    console.debug('[lorica] swallowed benign error:', ev.error?.message || ev.error);
  }
});

const root = createRoot(document.getElementById('root'));
root.render(<App />);

