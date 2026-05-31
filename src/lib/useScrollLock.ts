import { useEffect } from 'react';

// Module-level reference counter so multiple stacked modals lock/unlock
// correctly — the body is only restored when the last lock releases.
let lockCount = 0;
let savedScrollY = 0;

function engageLock() {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount > 1) return; // already locked by an outer modal

  savedScrollY = window.scrollY;
  const { style } = document.body;
  style.position = 'fixed';
  style.top = `-${savedScrollY}px`;
  style.left = '0';
  style.right = '0';
  style.width = '100%';
  style.overflow = 'hidden';
}

function releaseLock() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return; // an outer modal is still open

  const { style } = document.body;
  style.position = '';
  style.top = '';
  style.left = '';
  style.right = '';
  style.width = '';
  style.overflow = '';
  window.scrollTo(0, savedScrollY);
}

/**
 * Robust, iOS-Safari-safe body scroll lock.
 *
 * While `active` is true the page behind cannot scroll. Uses a module-level
 * reference counter so stacked modals each hold a lock and the body is only
 * restored once the final lock is released.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    engageLock();
    return () => {
      releaseLock();
    };
  }, [active]);
}
