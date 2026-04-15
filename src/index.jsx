// Lorica — Tauri Entry Point
// The bridge must load first to create window.lorica
window.global = window;

import './loricaBridge';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

