/**
 * Dæmi um jsdom-íhluta próf — TEMPLATE fyrir teymið.
 *
 * Keyrsla: npm run test:components
 * Eða: npx vitest run --project jsdom
 *
 * Þetta próf sýnir:
 *  1. Hvernig á að nota renderWithProviders (MemoryRouter + ErrorBoundary).
 *  2. @testing-library/jest-dom matchers (toBeInTheDocument o.fl.).
 *  3. Einfalt smella-próf með userEvent.
 *
 * Rauntíma próf fyrir íhluti eiga heima í skrám við hlið þeirra íhluta,
 * t.d. src/components/ui/Button.test.tsx.
 */
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { Button } from '@/components/ui/Button';

describe('Button (jsdom dæmi)', () => {
  it('birtir texta sem er gefinn', () => {
    renderWithProviders(<Button>Smella hér</Button>);
    expect(screen.getByRole('button', { name: /Smella hér/i })).toBeInTheDocument();
  });

  it('kallar á onClick þegar smellt er', async () => {
    const user = userEvent.setup();
    let clicked = false;
    renderWithProviders(<Button onClick={() => { clicked = true; }}>Hnappur</Button>);
    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('lætur disabled-stöðu birta rétt', () => {
    renderWithProviders(<Button disabled>Óvirkur</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
