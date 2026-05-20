import { Outlet, NavLink } from 'react-router-dom';
import {
  History,
  Home,
  Layers,
  Leaf,
  Scale,
  Sprout,
  Thermometer,
  FlaskConical,
} from 'lucide-react';
import { Logo, Wordmark } from './Logo';
import { Eyebrow } from './ui/Eyebrow';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/home', label: 'Heim', icon: Home, available: true },
  { to: '/grows', label: 'Ræktanir', icon: Layers, available: false },
  { to: '/plants', label: 'Plöntur', icon: Sprout, available: false },
  { to: '/environment', label: 'Umhverfi', icon: Thermometer, available: false },
  { to: '/harvest', label: 'Uppskera', icon: Scale, available: false },
  { to: '/sauces', label: 'Sósur', icon: FlaskConical, available: false },
  { to: '/varieties', label: 'Afbrigði', icon: Leaf, available: false },
  { to: '/history', label: 'Safn', icon: History, available: false },
];

const mobileNav = [
  { to: '/home', label: 'Heim', icon: Home, available: true },
  { to: '/plants', label: 'Plöntur', icon: Sprout, available: false },
  { to: '/grows', label: 'Ræktanir', icon: Layers, available: false },
  { to: '/sauces', label: 'Sósur', icon: FlaskConical, available: false },
  { to: '/more', label: 'Meira', icon: Scale, available: false },
];

export function Layout() {
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
        <div
          className="mx-[18px] mb-5 p-3 rounded-xl"
          style={{
            background: 'rgba(36,56,39,.6)',
            border: '1px solid rgba(64,104,67,.4)',
          }}
        >
          <Eyebrow color="var(--cream-400)">Húsið</Eyebrow>
          <div
            className="sp-display"
            style={{
              fontSize: 14,
              color: 'var(--cream-50)',
              marginTop: 4,
            }}
          >
            Garðabær · 21°C
          </div>
          <div style={{ fontSize: 11, color: 'rgba(231,217,168,.55)' }}>
            Sólarlag 22:48 · Sólris 03:51
          </div>
        </div>
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
          className="sp-display"
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--cream-50)',
            letterSpacing: '-0.02em',
          }}
        >
          Spíra
        </span>
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
