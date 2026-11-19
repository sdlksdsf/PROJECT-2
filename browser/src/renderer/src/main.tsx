import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './styles/base.css';
import './styles/chrome.css';
import './styles/start.css';
import './styles/pages.css';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Kimmino: #root element missing');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
