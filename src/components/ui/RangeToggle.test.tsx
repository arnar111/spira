/**
 * RangeToggle.tsx — renders 4 options, calls onChange with correct RangeDays value.
 * run: npm run test:components
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { RangeToggle } from '@/components/ui/RangeToggle';

describe('RangeToggle', () => {
  it('sýnir allar 4 valkosti', () => {
    renderWithProviders(<RangeToggle value={7} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '7 d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '14 d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Allt' })).toBeInTheDocument();
  });

  it('kallar onChange með 14 þegar „14 d" er valinn', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<RangeToggle value={7} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '14 d' }));
    expect(onChange).toHaveBeenCalledWith(14);
  });

  it('kallar onChange með 30 þegar „30 d" er valinn', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<RangeToggle value={7} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '30 d' }));
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('kallar onChange með null þegar „Allt" er valinn', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<RangeToggle value={7} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Allt' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('kallar onChange með 7 þegar „7 d" er valinn', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<RangeToggle value={null} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '7 d' }));
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
