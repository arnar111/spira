import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, Loader2, Sprout, UserPlus } from 'lucide-react';
import { GrowingPlant } from '@/components/GrowingPlant';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import {
  ApiError,
  CODE_LENGTH,
  isValidCode,
  normalizeCode,
  setCurrentAccount,
  signIn,
  signUp,
  type AccountResponse,
} from '@/lib/account';
import { clearLocalData, importSnapshot } from '@/lib/sync';
import { DEMO_CODE, DEMO_NAME, seedDemoData } from '@/lib/demo';

type Mode = 'signin' | 'signup';

interface LoginProps {
  onSignedIn: () => void;
}

export function Login({ onSignedIn }: LoginProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    if (!isValidCode(code)) return false;
    if (mode === 'signup' && name.trim().length === 0) return false;
    return true;
  }, [code, name, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Demo account — bypass network and seed a rich ghost dataset locally.
      if (code === DEMO_CODE) {
        await seedDemoData();
        setCurrentAccount({ code: DEMO_CODE, name: DEMO_NAME });
        onSignedIn();
        navigate('/home', { replace: true });
        return;
      }

      let result: AccountResponse;
      if (mode === 'signup') {
        await clearLocalData();
        result = await signUp(code, name.trim(), { version: 1 });
      } else {
        result = await signIn(code);
        await clearLocalData();
        if (result.data && typeof result.data === 'object') {
          await importSnapshot(result.data);
        }
      }
      setCurrentAccount({ code: result.code, name: result.name });
      onSignedIn();
      navigate(mode === 'signup' ? '/setup' : '/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Eitthvað fór úrskeiðis. Reyndu aftur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-moss-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-terracotta-500/15 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <GrowingPlant size={180} stage={2} delay={0.2} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="heading text-4xl sm:text-5xl font-semibold text-cream-50 mb-2 text-center"
        >
          Spíra
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="text-cream-300/70 text-center mb-8"
        >
          {mode === 'signin'
            ? 'Sláðu inn kóðann þinn til að halda áfram.'
            : 'Veldu þér 3-stafa kóða — hann er þinn aðgangur.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.55 }}
          className="w-full"
        >
          <div className="flex p-1 mb-6 rounded-2xl bg-moss-950/60 border border-moss-800/40">
            <TabButton active={mode === 'signin'} onClick={() => setMode('signin')}>
              <KeyRound size={15} />
              Sláðu inn kóða
            </TabButton>
            <TabButton active={mode === 'signup'} onClick={() => setMode('signup')}>
              <UserPlus size={15} />
              Búa til kóða
            </TabButton>
          </div>

          <Card className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div>
                  <label className="text-sm text-cream-200 font-medium mb-2 flex items-center gap-1.5">
                    <Sprout size={14} className="text-moss-300" />
                    Nafn
                  </label>
                  <input
                    autoFocus={mode === 'signup'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="t.d. Arnar"
                    className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-4 py-2.5 text-cream-50 placeholder:text-cream-400/40 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-400/20 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-cream-200 font-medium mb-2 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-moss-300" />
                  Kóði ({CODE_LENGTH} stafir)
                </label>
                <CodeInput
                  value={code}
                  onChange={setCode}
                  autoFocus={mode === 'signin'}
                />
                {mode === 'signup' && (
                  <p className="mt-2 text-xs text-cream-400/60">
                    Veldu eitthvað minnisstætt: bókstafir A–Z og tölur 0–9.
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-terracotta-900/40 border border-terracotta-700/40 px-3.5 py-2.5 text-sm text-terracotta-200">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || busy}>
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {mode === 'signup' ? 'Bý til…' : 'Sæki…'}
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Búa til reikning' : 'Halda áfram'}
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>
          </Card>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => setCode(DEMO_CODE)}
              className="w-full mt-4 rounded-xl border border-dashed border-terracotta-700/40 bg-terracotta-900/20 hover:bg-terracotta-900/30 transition-colors px-4 py-3 text-sm text-terracotta-200"
            >
              <span className="font-semibold">Prufa demo</span>
              <span className="text-terracotta-200/70"> — kóði {DEMO_CODE} með tilbúnum ræktunum</span>
            </button>
          )}

          <p className="text-xs text-cream-400/50 text-center mt-5 px-4 leading-relaxed">
            Gögnin þín eru samstillt við skýið og fylgja kóðanum þínum á öllum tækjum.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
        active ? 'bg-moss-800/80 text-cream-50 shadow' : 'text-cream-300 hover:text-cream-100',
      )}
    >
      {children}
    </button>
  );
}

function CodeInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  function handleInput(idx: number, raw: string) {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length === 0) {
      const next = chars.slice();
      next[idx] = '';
      onChange(next.join(''));
      return;
    }
    const next = chars.slice();
    for (let i = 0; i < clean.length && idx + i < CODE_LENGTH; i++) {
      next[idx + i] = clean[i];
    }
    onChange(next.join('').slice(0, CODE_LENGTH));
    const focusIdx = Math.min(idx + clean.length, CODE_LENGTH - 1);
    inputs.current[focusIdx]?.focus();
    if (idx + clean.length >= CODE_LENGTH) inputs.current[CODE_LENGTH - 1]?.blur();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      e.preventDefault();
      const next = chars.slice();
      next[idx - 1] = '';
      onChange(next.join(''));
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    // Líming tekur fyrstu 3 gildu stafina (normalizeCode klippir ekki lengur).
    const pasted = normalizeCode(e.clipboardData.getData('text')).slice(0, CODE_LENGTH);
    if (pasted) onChange(pasted);
  }

  return (
    <div className="flex justify-center gap-3">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          inputMode="text"
          maxLength={CODE_LENGTH}
          value={c}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="heading w-16 h-20 sm:w-20 sm:h-24 text-center text-4xl sm:text-5xl font-semibold rounded-2xl bg-moss-950/60 border border-moss-800 text-cream-50 caret-moss-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-400/20 transition-colors uppercase"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      ))}
    </div>
  );
}
