import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Cloud,
  CloudAlert,
  CloudUpload,
  History,
  Home,
  Layers,
  Leaf,
  LogOut,
  Scale,
  Sprout,
  Thermometer,
} from 'lucide-react';
import { Logo, Wordmark } from './Logo';
import { cn } from '@/lib/cn';
import { clearCurrentAccount, type Account } from '@/lib/account';
import { clearLocalData, syncManager, type SyncStatus } from '@/lib/sync';

const navItems = [
  { to: '/home', label: 'Heim', icon: Home, available: true },
  { to: '/grows', label: 'Ræktanir', icon: Layers, available: true },
  { to: '/plants', label: 'Plöntur', icon: Sprout, available: true },
  { to: '/environment', label: 'Umhverfi', icon: Thermometer, available: true },
  { to: '/harvest', label: 'Uppskera', icon: Scale, available: true },
  { to: '/varieties', label: 'Afbrigði', icon: Leaf, available: true },
  { to: '/history', label: 'Safn', icon: History, available: true },
];

const mobileNav = [
  { to: '/home', label: 'Heim', icon: Home, available: true },
  { to: '/plants', label: 'Plöntur', icon: Sprout, available: true },
  { to: '/grows', label: 'Ræktanir', icon: Layers, available: true },
  { to: '/varieties', label: 'Afbrigði', icon: Leaf, available: true },
  { to: '/harvest', label: 'Uppskera', icon: Scale, available: true },
];

interface LayoutProps {
  account: Account;
  onSignOut: () => void;
}

export function Layout({ account, onSignOut }: LayoutProps) {
  return (
    <div className="sp-bg min-h-screen md:flex">
      <aside
        className="hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:border-r"
        style={{ borderColor: 'rgba(64,104,67,.3)' }}
      >
        <div className="px-[18px] pt-6 pb-1">
          <Wordmark size={22} />
        </div>
        <nav className="flex-1 px-[18px] py-5 flex flex-col gap-1">
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
        <Outlet />
      </main>

      <nav
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
                  !item.available && 'opacity-60 pointer-events-none',
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
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  useEffect(
    () =>
      syncManager.subscribe((s, t) => {
        setStatus(s);
        setLastSyncedAt(t);
      }),
    [],
  );
  return { status, lastSyncedAt };
}

function AccountFooter({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const { status, lastSyncedAt } = useSyncStatus();
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
          <SyncBadge status={status} lastSyncedAt={lastSyncedAt} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => handleSignOut(onSignOut)}
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
    </div>
  );
}

function MobileAccountBadge({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const { status } = useSyncStatus();
  return (
    <button
      type="button"
      onClick={() => handleSignOut(onSignOut)}
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
  );
}

async function handleSignOut(onSignOut: () => void) {
  if (
    !confirm(
      'Skrá út? Local gögn verða hreinsuð. Þú getur skráð þig inn aftur með kóðanum þínum.',
    )
  )
    return;
  await syncManager.flush();
  await clearLocalData();
  clearCurrentAccount();
  onSignOut();
}

function SyncBadge({
  status,
  lastSyncedAt,
}: {
  status: SyncStatus;
  lastSyncedAt: number | null;
}) {
  const { icon: Icon, label, tone } = describeSync(status, lastSyncedAt);
  return (
    <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: tone }}>
      <Icon
        size={11}
        className={status === 'syncing' || status === 'pending' ? 'animate-pulse' : ''}
      />
      <span>{label}</span>
    </div>
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
