/**
 * Tabs.tsx — pill and segmented variants, active state, onChange.
 * run: npm run test:components
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { Tabs } from '@/components/ui/Tabs';

describe('Tabs — pill variant (default)', () => {
  const TABS = ['Flipi 1', 'Flipi 2', 'Flipi 3'];

  it('sýnir alla flipa', () => {
    renderWithProviders(<Tabs tabs={TABS} active={0} />);
    for (const label of TABS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('kallar onChange með réttum vísitölu', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Tabs tabs={TABS} active={0} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Flipi 2' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('kallar onChange þegar þriðji flipinn er valinn', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Tabs tabs={TABS} active={0} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Flipi 3' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('Tabs — segmented variant', () => {
  const TABS = ['Vika', 'Mánuður', 'Ár'];

  it('sýnir alla hluta-flipa', () => {
    renderWithProviders(<Tabs tabs={TABS} active={1} variant="segmented" />);
    for (const label of TABS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('kallar onChange við smelli í segmented', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Tabs tabs={TABS} active={0} variant="segmented" onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Ár' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('styður items prop með ReactNode', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Tabs
        items={[<span key="a">A</span>, <span key="b">B</span>]}
        active={0}
        variant="segmented"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    await user.click(screen.getByText('B'));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
