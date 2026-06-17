/**
 * Vitest jsdom project setup file.
 * - Extends expect with @testing-library/jest-dom matchers.
 * - Registers a global afterEach that runs cleanup() so rendered trees
 *   are unmounted between tests (mirrors the React Testing Library default).
 */
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
