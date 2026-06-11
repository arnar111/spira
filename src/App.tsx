import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Welcome } from './pages/Welcome';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Grows } from './pages/Grows';
import { GrowDetail } from './pages/GrowDetail';
import { Plants } from './pages/Plants';
import { Environment } from './pages/Environment';
import { Harvest } from './pages/Harvest';

// Þungar/sjaldnar-fyrstu síður hlaðast letilega (5.4) — SetupWizard er stór,
// RosOverview dregur react-markdown með sér, Varieties ber allan vörulistann.
// Heim/Ræktanir/GrowDetail/Plöntur haldast í aðal-knippinu (fyrstu skjáir).
const SetupWizard = lazy(() =>
  import('./pages/SetupWizard').then((m) => ({ default: m.SetupWizard })),
);
const RosOverview = lazy(() =>
  import('./pages/RosOverview').then((m) => ({ default: m.RosOverview })),
);
const Varieties = lazy(() =>
  import('./pages/Varieties').then((m) => ({ default: m.Varieties })),
);
const History = lazy(() =>
  import('./pages/History').then((m) => ({ default: m.History })),
);

/** Látlaus biðskjár fyrir letihlaðnar síður — sama og app-hleðslan. */
function LazyFallback() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="text-cream-300 text-sm">Hleður…</div>
    </div>
  );
}
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
      // Sækjum ský-breytingar frá öðrum tækjum strax við ræsingu (tæki sótti
      // áður aðeins við innskráningu — sjá syncManager.pull).
      void syncManager.pull({ force: true });
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
      <Suspense fallback={<LazyFallback />}>
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
            <Route path="/ros" element={<RosOverview />} />
            <Route path="/grows" element={<Grows />} />
            <Route path="/grow/:id" element={<GrowDetail />} />
            <Route path="/plants" element={<Plants />} />
            <Route path="/varieties" element={<Varieties />} />
            <Route path="/environment" element={<Environment />} />
            <Route path="/harvest" element={<Harvest />} />
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
