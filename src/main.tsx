import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Spíra notar EKKI service worker. Eldri útgáfa (eða önnur síða á localhost)
// gat skilið eftir "draugs"-service-worker sem hlerar leiðir (t.d. /grow/:id)
// og veldur netvillum. Afskráum allar SW-skráningar og hreinsum cache þeirra.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
