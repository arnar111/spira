import { describe, expect, it, vi } from 'vitest';
import { announce, subscribeAnnounce } from './announce';

describe('announce', () => {
  it('sendir skilaboð til áskrifenda', () => {
    const spy = vi.fn();
    const unsub = subscribeAnnounce(spy);
    announce('Skráning vistuð');
    expect(spy).toHaveBeenCalledWith('Skráning vistuð');
    unsub();
  });

  it('hunsar tóm skilaboð (líka bara bil)', () => {
    const spy = vi.fn();
    const unsub = subscribeAnnounce(spy);
    announce('');
    announce('   ');
    expect(spy).not.toHaveBeenCalled();
    unsub();
  });

  it('trimmar skilaboð', () => {
    const spy = vi.fn();
    const unsub = subscribeAnnounce(spy);
    announce('  Uppskera skráð  ');
    expect(spy).toHaveBeenCalledWith('Uppskera skráð');
    unsub();
  });

  it('hættir að fá skilaboð eftir afskráningu', () => {
    const spy = vi.fn();
    const unsub = subscribeAnnounce(spy);
    unsub();
    announce('eitthvað');
    expect(spy).not.toHaveBeenCalled();
  });
});
