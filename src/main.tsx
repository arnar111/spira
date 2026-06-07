import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PwaUpdateToast } from './components/PwaUpdateToast';
import './index.css';

// Service-worker (5.3): Spíra notar nú SW (vite-plugin-pwa) fyrir uppsetningu
// og offline-skel. Skráningin, eins-skiptis hreinsun á eldri „draugs"-SW og
// neyðarrofinn `localStorage['spira:disable-sw']` búa í src/lib/sw.ts og eru
// ræst úr <PwaUpdateToast/>. /api/* er ALDREI vistað í cache.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
      <PwaUpdateToast />
    </ErrorBoundary>
  </StrictMode>,
);
