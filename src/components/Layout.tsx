import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Cloud,
  CloudAlert,
  CloudUpload,
  Flower2,
  History,
  Home,
  Layers,
  Leaf,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  Scale,
  Sprout,
  Thermometer,
} from 'lucide-react';
import { Logo, Wordmark } from './Logo';
import { cn } from '@/lib/cn';
import { clearCurrentAccount, type Account } from '@/lib/account';
import { clearLocalData, syncManager, type SyncStatus } from '@/lib/sync';
import { ErrorBoundary } from './ErrorBoundary';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { subscribeAnnounce } from '@/lib/announce';

const navItems = [
  { to: '/home', label: 'Heim', icon: Home, available: true },
  { to: '/ros', label: 'Rós', icon: Flower2, available: true },
  { to: '/grows', label: 'Ræktanir', icon: Layers, available: true },
  { to: '/plants', label: 'Plöntur', icon: Sprout, available: true },
  { to: '/environment', label: 'Umhverfi', icon: Thermometer, available: true },
  { to: '/harvest', label: 'Uppskera', icon: Scale, available: true },
  { to: '/varieties', label: 'Afbrigði', icon: Leaf, available: true },
  { to: '/history', label: 'Safn', icon: History, available: true },
];

// Fimm aðalflipar fyrir þumalfingur; afgangurinn fer í „Meira"-blað (1.4).
const mobileNav = [
  { to: '/home', label: 'Heim', icon: Home, available: true },
  { to: '/ros', label: 'Rós', icon: Flower2, available: true },
  { to: '/grows', label: 'Ræktanir', icon: Layers, available: true },
  { to: '/plants', label: 'Plöntur', icon: Sprout, available: true },
  { to: '/harvest', label: 'Uppskera', icon: Scale, available: true },
];

// Áfangastaðir sem komast ekki fyrir í þumalröðinni — opnast í „Meira"-blaði.
const mobileMore = [
  { to: '/environment', label: 'Umhverfi', icon: Thermometer },
  { to: '/varieties', label: 'Afbrigði', icon: Leaf },
  { to: '/history', label: 'Safn', icon: History },
];

interface LayoutProps {
  account: Account;
  onSignOut: () => void;
}

export function Layout({ account, onSignOut }: LayoutProps) {
  const location = useLocation();
  return (
    <div className="sp-bg min-h-screen md:flex">
      <aside
        className="hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:border-r"
        style={{ borderColor: 'rgba(64,104,67,.3)' }}
      >
        <div className="px-[18px] pt-6 pb-1">
          <Wordmark size={22} />
        </div>
        <nav aria-label="Aðalvalmynd" className="flex-1 px-[18px] py-5 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'text-[var(--cream-50)]'
                    : 'text-[rgba(231,217,168,.7)] hover:bg-[rgba(84,130,85,.12)]',
                  !item.available && 'opacity-50 pointer-events-none',
                )
              }
              style={({ isActive }) =>
                isActive ? { background: 'rgba(84,130,85,.18)' } : undefined
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={16}
                    color={isActive ? 'var(--moss-300)' : 'rgba(231,217,168,.5)'}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <AccountFooter account={account} onSignOut={onSignOut} />
      </aside>

      <header
        className="md:hidden sticky top-0 z-30 px-5 flex items-center gap-3 glass-strong"
        style={{
          borderBottom: '1px solid rgba(64,104,67,.4)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingBottom: 12,
        }}
      >
        <Logo size={22} animated />
        <span
          className="sp-display flex-1"
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--cream-50)',
            letterSpacing: '-0.02em',
          }}
        >
          Spíra
        </span>
        <MobileAccountBadge account={account} onSignOut={onSignOut} />
      </header>

      <main className="flex-1 min-w-0 pb-nav-safe md:pb-0">
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <MobileNav />

      <AnnounceRegion />
    </div>
  );
}

function MobileNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMore.some((m) => location.pathname.startsWith(m.to));
  return (
    <>
      <nav
        aria-label="Aðalvalmynd"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30"
        style={{
          paddingTop: 10,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
          background:
            'linear-gradient(to top, rgba(18,31,20,.95), rgba(18,31,20,.7) 70%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex justify-between items-end">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 transition-colors',
                  isActive ? 'text-[var(--cream-50)]' : 'text-[rgba(231,217,168,.45)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 48,
                      height: 32,
                      borderRadius: 999,
                      background: isActive ? 'rgba(84,130,85,.35)' : 'transparent',
                      border: isActive
                        ? '1px solid rgba(159,191,157,.4)'
                        : '1px solid transparent',
                    }}
                  >
                    <item.icon size={20} />
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '0.02em' }}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Fleiri síður"
            className={cn(
              'flex flex-col items-center gap-0.5 transition-colors',
              moreActive ? 'text-[var(--cream-50)]' : 'text-[rgba(231,217,168,.45)]',
            )}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 48,
                height: 32,
                borderRadius: 999,
                background: moreActive ? 'rgba(84,130,85,.35)' : 'transparent',
                border: moreActive ? '1px solid rgba(159,191,157,.4)' : '1px solid transparent',
              }}
            >
              <MoreHorizontal size={20} />
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '0.02em' }}>
              Meira
            </span>
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} eyebrow="Fleiri síður" title="Meira">
        <div className="flex flex-col gap-1.5">
          {mobileMore.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[var(--cream-50)]'
                    : 'text-[rgba(231,217,168,.8)] hover:bg-[rgba(84,130,85,.12)]',
                )
              }
              style={({ isActive }) =>
                isActive ? { background: 'rgba(84,130,85,.18)' } : undefined
              }
            >
              <item.icon size={18} color="var(--moss-300)" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </Modal>
    </>
  );
}

/** Eitt aria-live svæði fyrir alla skjálesara-tilkynningar (1.2). */
function AnnounceRegion() {
  const [message, setMessage] = useState('');
  useEffect(() => subscribeAnnounce(setMessage), []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  useEffect(
    () =>
      syncManager.subscribe((s) => {
        setStatus(s.status);
        setLastSyncedAt(s.lastSyncedAt);
        setLastError(s.lastError);
      }),
    [],
  );
  return { status, lastSyncedAt, lastError };
}

function AccountFooter({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const { status, lastSyncedAt, lastError } = useSyncStatus();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  return (
    <div
      className="mx-[18px] mb-5 p-3 rounded-xl space-y-2.5"
      style={{
        background: 'rgba(36,56,39,.6)',
        border: '1px solid rgba(64,104,67,.4)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="sp-display shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold tracking-wider"
          style={{
            background: 'rgba(84,130,85,.4)',
            color: 'var(--cream-50)',
            border: '1px solid rgba(159,191,157,.25)',
          }}
        >
          {account.code}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm truncate font-medium"
            style={{ color: 'var(--cream-50)' }}
          >
            {account.name}
          </div>
          <SyncBadge status={status} lastSyncedAt={lastSyncedAt} lastError={lastError} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setConfirmSignOut(true)}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors"
        style={{
          color: 'rgba(231,217,168,.7)',
          border: '1px solid rgba(64,104,67,.5)',
          background: 'transparent',
        }}
      >
        <LogOut size={12} />
        Skrá út
      </button>
      <SignOutConfirm
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onSignOut={onSignOut}
      />
    </div>
  );
}

function MobileAccountBadge({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const { status } = useSyncStatus();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmSignOut(true)}
        className="flex items-center gap-1.5 rounded-lg pl-2 pr-2.5 py-1.5 text-xs transition-colors"
        style={{
          background: 'rgba(36,56,39,.7)',
          border: '1px solid rgba(64,104,67,.4)',
          color: 'var(--cream-100)',
        }}
        title={`${account.name} (${account.code}) — smelltu til að skrá þig út`}
        aria-label={`Skráður inn sem ${account.name}, kóði ${account.code}`}
      >
        <SyncDot status={status} />
        <span className="sp-display font-semibold tracking-wider">{account.code}</span>
      </button>
      <SignOutConfirm
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onSignOut={onSignOut}
      />
    </>
  );
}

function SignOutConfirm({
  open,
  onClose,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  async function doSignOut() {
    await syncManager.flush();
    await clearLocalData();
    clearCurrentAccount();
    onSignOut();
  }
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => void doSignOut()}
      title="Skrá út"
      body="Gögnin í þessu tæki verða hreinsuð. Þú getur skráð þig inn aftur með kóðanum þínum og sótt afritið úr skýinu."
      confirmLabel="Skrá út"
      destructive
    />
  );
}

function SyncBadge({
  status,
  lastSyncedAt,
  lastError,
}: {
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
}) {
  const { icon: Icon, label, tone } = describeSync(status, lastSyncedAt);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await syncManager.syncNow();
    } finally {
      setRetrying(false);
    }
  }

  const badge = (
    <span className="inline-flex items-center gap-1">
      <Icon
        size={11}
        className={status === 'syncing' || status === 'pending' ? 'animate-pulse' : ''}
      />
      <span>{label}</span>
    </span>
  );

  if (status !== 'error') {
    return (
      <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: tone }}>
        {badge}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="flex items-center gap-1 text-[11px] mt-0.5 underline-offset-2 hover:underline"
        style={{ color: tone }}
        aria-label="Sýna ástæðu fyrir misheppnaðri samstillingu"
      >
        {badge}
      </button>
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        eyebrow="Samstilling"
        title="Synci klikkaði"
        size="sm"
      >
        <div className="space-y-3 text-sm" style={{ color: 'var(--cream-300)' }}>
          <p>
            Síðasta samstilling við skýið mistókst. Gögnin þín eru samt örugg í
            tækinu — Spíra reynir aftur sjálfkrafa.
          </p>
          {lastError && (
            <p
              className="sp-mono text-[11px] rounded-lg px-3 py-2"
              style={{
                background: 'rgba(18,31,20,.6)',
                border: '1px solid rgba(64,104,67,.4)',
                color: 'rgb(212,128,107)',
                wordBreak: 'break-word',
              }}
            >
              {lastError}
            </p>
          )}
          <p className="text-[11px]" style={{ color: 'var(--cream-400)' }}>
            {lastSyncedAt
              ? `Síðast vistað ${formatRelative(lastSyncedAt)}.`
              : 'Engin samstilling hefur tekist enn.'}
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="md" onClick={() => setDetailsOpen(false)}>
            Loka
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={retrying}
            onClick={() => void retry()}
          >
            <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Reyni…' : 'Reyna aftur'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function SyncDot({ status }: { status: SyncStatus }) {
  const color =
    status === 'error'
      ? 'rgb(212,128,107)'
      : status === 'syncing' || status === 'pending'
        ? 'rgba(231,217,168,.7)'
        : 'var(--moss-300)';
  return (
    <span
      className={cn(
        'w-1.5 h-1.5 rounded-full',
        (status === 'syncing' || status === 'pending') && 'animate-pulse',
      )}
      style={{ background: color }}
    />
  );
}

function describeSync(status: SyncStatus, lastSyncedAt: number | null) {
  if (status === 'syncing')
    return { icon: CloudUpload, label: 'Samstilli…', tone: 'rgba(231,217,168,.8)' };
  if (status === 'pending')
    return { icon: CloudUpload, label: 'Bíður…', tone: 'rgba(231,217,168,.7)' };
  if (status === 'error')
    return { icon: CloudAlert, label: 'Synci klikkaði', tone: 'rgb(212,128,107)' };
  if (lastSyncedAt) {
    return {
      icon: Cloud,
      label: `Vistað ${formatRelative(lastSyncedAt)}`,
      tone: 'rgba(159,191,157,.85)',
    };
  }
  return { icon: Cloud, label: 'Tilbúið', tone: 'rgba(159,191,157,.65)' };
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'núna';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `fyrir ${mins} mín`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `fyrir ${hours} klst`;
  const days = Math.floor(hours / 24);
  return `fyrir ${days} d`;
}
