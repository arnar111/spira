import { Outlet, NavLink } from 'react-router-dom';
import { Home, BookOpen, Sprout, LineChart } from 'lucide-react';
import { Logo } from './Logo';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/home', label: 'Heim', icon: Home },
  { to: '/grows', label: 'Ræktanir', icon: Sprout, disabled: true },
  { to: '/library', label: 'Afbrigði', icon: BookOpen, disabled: true },
  { to: '/insights', label: 'Innsýn', icon: LineChart, disabled: true },
];

export function Layout() {
  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r md:border-moss-800/40 md:bg-moss-950/60 md:backdrop-blur-xl">
        <div className="flex items-center gap-3 px-6 py-7">
          <Logo size={28} animated />
          <span className="heading text-2xl font-semibold text-cream-50">Spíra</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-moss-800/60 text-cream-50'
                    : 'text-cream-300 hover:bg-moss-900/40 hover:text-cream-100',
                  item.disabled && 'opacity-40 pointer-events-none',
                )
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.disabled && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-moss-400">
                  brátt
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs text-cream-400/50">
          Fasi 1 · grunnur
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 glass-strong border-b border-moss-800/40 px-5 py-3 flex items-center gap-3">
        <Logo size={24} animated />
        <span className="heading text-xl font-semibold text-cream-50">Spíra</span>
      </header>

      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-moss-800/40 pb-safe">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                  isActive ? 'text-moss-300' : 'text-cream-400',
                  item.disabled && 'opacity-40 pointer-events-none',
                )
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
