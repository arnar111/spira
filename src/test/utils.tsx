/**
 * Shared test utilities for the jsdom (component) project.
 *
 * Usage:
 *   import { renderWithProviders, resetDb } from '@/test/utils';
 *
 * renderWithProviders wraps the subject in:
 *   - React Testing Library's render
 *   - react-router-dom MemoryRouter (initialEntries defaults to ['/'])
 *   - ErrorBoundary for catching render-time throws
 *
 * resetDb clears every Dexie table between tests when you need a fresh
 * IndexedDB state. Call it in beforeEach inside the test file.
 */
import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Provider wrapper
// ---------------------------------------------------------------------------

interface WrapperOptions {
  /** Initial route entries for MemoryRouter. Defaults to ['/']. */
  initialEntries?: MemoryRouterProps['initialEntries'];
  /** Initial route index. Defaults to 0. */
  initialIndex?: number;
}

function createWrapper(opts: WrapperOptions = {}) {
  const { initialEntries = ['/'], initialIndex = 0 } = opts;
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </MemoryRouter>
    );
  };
}

/**
 * Renders a React element inside MemoryRouter + ErrorBoundary and returns
 * the full @testing-library/react RenderResult.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    routerOptions,
    ...renderOptions
  }: { routerOptions?: WrapperOptions } & Omit<RenderOptions, 'wrapper'> = {},
): RenderResult {
  return render(ui, {
    wrapper: createWrapper(routerOptions),
    ...renderOptions,
  });
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

/**
 * Wipes every table in the Spira Dexie database.
 * Call this in a beforeEach when tests seed their own data.
 *
 * Example:
 *   import 'fake-indexeddb/auto';      // must be first import in test file
 *   import { resetDb } from '@/test/utils';
 *   beforeEach(resetDb);
 */
export async function resetDb(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
}
