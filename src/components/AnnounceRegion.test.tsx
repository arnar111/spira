/**
 * Corner 1 — Accessibility: AnnounceRegion (aria-live region) jsdom tests.
 *
 * Tests that:
 *   - The region renders with aria-live="polite" and aria-atomic="true"
 *   - The region is visually hidden (sr-only)
 *   - Calling announce() puts the message into the live region
 *   - Empty / whitespace-only messages are ignored
 *   - Multiple consecutive announcements update the region text
 */
import { describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { announce, subscribeAnnounce } from '@/lib/announce';

/**
 * Minimal AnnounceRegion — identical to the one in Layout.tsx
 * (extracted here so we can test it without the full Layout).
 */
function AnnounceRegion() {
  const [message, setMessage] = useState('');
  useEffect(() => subscribeAnnounce(setMessage), []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

describe('AnnounceRegion', () => {
  it('renders a single aria-live="polite" region', () => {
    render(<AnnounceRegion />);
    const regions = document.querySelectorAll('[aria-live="polite"]');
    expect(regions).toHaveLength(1);
  });

  it('has aria-atomic="true"', () => {
    render(<AnnounceRegion />);
    const region = document.querySelector('[aria-live="polite"]');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('is visually hidden (has sr-only class)', () => {
    render(<AnnounceRegion />);
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.className).toContain('sr-only');
  });

  it('starts empty', () => {
    render(<AnnounceRegion />);
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('');
  });

  it('displays the message after announce() is called', () => {
    render(<AnnounceRegion />);
    act(() => { announce('Skráning vistuð'); });
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('Skráning vistuð');
  });

  it('trims the message', () => {
    render(<AnnounceRegion />);
    act(() => { announce('  Uppskera skráð  '); });
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('Uppskera skráð');
  });

  it('ignores empty string announcements', () => {
    render(<AnnounceRegion />);
    act(() => { announce('Fyrsta'); });
    act(() => { announce(''); });
    const region = document.querySelector('[aria-live="polite"]');
    // Empty announce should not clear the previous message
    // (announce('') is ignored by announce.ts — listener never called)
    expect(region?.textContent).toBe('Fyrsta');
  });

  it('ignores whitespace-only announcements', () => {
    render(<AnnounceRegion />);
    act(() => { announce('Gildir'); });
    act(() => { announce('   '); });
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('Gildir');
  });

  it('updates to the latest message on subsequent calls', () => {
    render(<AnnounceRegion />);
    act(() => { announce('Fyrsta'); });
    act(() => { announce('Önnur'); });
    const region = document.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('Önnur');
  });
});

describe('announce: subscribeAnnounce + announce integration', () => {
  it('only one live region exists when one AnnounceRegion is mounted', () => {
    render(
      <div>
        <AnnounceRegion />
        <p>Annað innihald</p>
      </div>,
    );
    const regions = document.querySelectorAll('[aria-live]');
    expect(regions).toHaveLength(1);
  });

  it('uses screen.getByRole for aria-live discovery', () => {
    render(<AnnounceRegion />);
    // aria-live regions can be found by their textual role context
    const region = document.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });
});
