import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register PWA service worker with immediate auto-reload on update
// This is CRITICAL: without this, new SW versions install but never reload the page
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);