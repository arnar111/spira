/**
 * SearchInput.tsx — value display, onChange, clear button, aria-label.
 * run: npm run test:components
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { SearchInput, NoResults } from '@/components/ui/SearchInput';

describe('SearchInput', () => {
  it('sýnir placeholder texta', () => {
    renderWithProviders(
      <SearchInput value="" onChange={vi.fn()} placeholder="Leita að plöntum" />,
    );
    expect(
      screen.getByPlaceholderText('Leita að plöntum'),
    ).toBeInTheDocument();
  });

  it('kallar onChange þegar texti er sleginn inn', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SearchInput value="" onChange={onChange} />);
    await user.type(screen.getByRole('searchbox'), 'abc');
    // onChange called per character — each call passes just the new char since
    // the component is controlled and value prop stays ''.
    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('a');
    expect(onChange).toHaveBeenCalledWith('b');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('sýnir hreinsunarhnapp þegar gildi er til staðar', () => {
    renderWithProviders(<SearchInput value="paprika" onChange={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /Hreinsa leit/i }),
    ).toBeInTheDocument();
  });

  it('felur hreinsunarhnapp þegar gildi er tómt', () => {
    renderWithProviders(<SearchInput value="" onChange={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /Hreinsa leit/i }),
    ).not.toBeInTheDocument();
  });

  it('kallar onChange með tóman streng þegar hreinsa er smellt', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SearchInput value="paprika" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Hreinsa leit/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('notar aria-label prop', () => {
    renderWithProviders(
      <SearchInput
        value=""
        onChange={vi.fn()}
        aria-label="Leita í ræktunasafni"
      />,
    );
    expect(screen.getByRole('searchbox', { name: 'Leita í ræktunasafni' })).toBeInTheDocument();
  });
});

describe('NoResults', () => {
  it('sýnir sjálfgefinn skilaboðatexta', () => {
    renderWithProviders(<NoResults />);
    expect(screen.getByText('Ekkert fannst')).toBeInTheDocument();
  });

  it('sýnir sérsniðinn skilaboðatexta', () => {
    renderWithProviders(<NoResults message="Engar plöntur fundust" />);
    expect(screen.getByText('Engar plöntur fundust')).toBeInTheDocument();
  });
});
