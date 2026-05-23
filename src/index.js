import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import App from './App';

const defaultElectronApi = {
  window: {
    minimize: () => {},
    maximize: () => {},
    close: () => {},
  },
  db: { getSeedStatus: () => Promise.resolve({ seeded: true }) },
  excel: {},
  app: { getVersion: () => Promise.resolve('dev') },
};

const existingElectron = window.electron || {};
const safeDbTarget = { ...defaultElectronApi.db, ...(existingElectron.db || {}) };
const safeExcelTarget = { ...defaultElectronApi.excel, ...(existingElectron.excel || {}) };
const safeAppTarget = { ...defaultElectronApi.app, ...(existingElectron.app || {}) };

window.electron = {
  window: { ...defaultElectronApi.window, ...(existingElectron.window || {}) },
  db: new Proxy(safeDbTarget, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return () => Promise.resolve(null);
    },
  }),
  excel: new Proxy(safeExcelTarget, { get: () => () => Promise.resolve(null) }),
  app: new Proxy(safeAppTarget, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return () => Promise.resolve(null);
    },
  }),
};

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
