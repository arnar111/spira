import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Welcome } from './pages/Welcome';
import { SetupWizard } from './pages/SetupWizard';
import { Home } from './pages/Home';
import { Layout } from './components/Layout';
import { db, getOnboardingComplete } from './lib/db';
import { BUILT_IN_VARIETIES } from './lib/varieties';

export default function App() {
  const location = useLocation();
  const [onboardingState, setOnboardingState] = useState<'loading' | 'pending' | 'complete'>(
    'loading',
  );

  useEffect(() => {
    (async () => {
      await Promise.all(
        BUILT_IN_VARIETIES.map((v) => db.varieties.put(v)),
      );
      const done = await getOnboardingComplete();
      setOnboardingState(done ? 'complete' : 'pending');
    })();
  }, []);

  if (onboardingState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-cream-300 text-sm">Hleður…</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            onboardingState === 'complete' ? (
              <Navigate to="/home" replace />
            ) : (
              <Welcome />
            )
          }
        />
        <Route
          path="/setup"
          element={<SetupWizard onComplete={() => setOnboardingState('complete')} />}
        />
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
