import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Welcome } from './pages/Welcome';
import { SetupWizard } from './pages/SetupWizard';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { db, getOnboardingComplete } from './lib/db';
import { BUILT_IN_VARIETIES } from './lib/varieties';
import { getCurrentAccount, type Account } from './lib/account';
import { installAutoSyncHooks, syncManager } from './lib/sync';

type AppState =
  | { kind: 'loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'authenticated'; account: Account; onboardingComplete: boolean };

export default function App() {
  const location = useLocation();
  const [state, setState] = useState<AppState>({ kind: 'loading' });

  useEffect(() => {
    installAutoSyncHooks();
    (async () => {
      await Promise.all(BUILT_IN_VARIETIES.map((v) => db.varieties.put(v)));
      const account = getCurrentAccount();
      if (!account) {
        setState({ kind: 'unauthenticated' });
        return;
      }
      syncManager.setAccount(account.code);
      const onboardingComplete = await getOnboardingComplete();
      setState({ kind: 'authenticated', account, onboardingComplete });
    })();
  }, []);

  async function refreshAfterSignIn() {
    const account = getCurrentAccount();
    if (!account) {
      setState({ kind: 'unauthenticated' });
      return;
    }
    syncManager.setAccount(account.code);
    const onboardingComplete = await getOnboardingComplete();
    setState({ kind: 'authenticated', account, onboardingComplete });
  }

  function handleSignOut() {
    syncManager.setAccount(null);
    setState({ kind: 'unauthenticated' });
  }

  function handleOnboardingComplete() {
    setState((prev) =>
      prev.kind === 'authenticated' ? { ...prev, onboardingComplete: true } : prev,
    );
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-cream-300 text-sm">Hleður…</div>
      </div>
    );
  }

  if (state.kind === 'unauthenticated') {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="*" element={<Login onSignedIn={refreshAfterSignIn} />} />
        </Routes>
      </AnimatePresence>
    );
  }

  const { account, onboardingComplete } = state;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            onboardingComplete ? (
              <Navigate to="/home" replace />
            ) : (
              <Welcome />
            )
          }
        />
        <Route
          path="/setup"
          element={<SetupWizard onComplete={handleOnboardingComplete} />}
        />
        <Route element={<Layout account={account} onSignOut={handleSignOut} />}>
          <Route path="/home" element={<Home />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
