import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de window.matchMedia para testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock de ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Evita bucles infinitos de requestAnimationFrame de framer-motion/HeroUI.
// En jsdom RAF dispara de inmediato creando cadenas infinitas entre tests.
// Los callbacks nunca se ejecutan pero cancelAnimationFrame sí limpia la referencia.
let _rafId = 0;
global.requestAnimationFrame = (_cb: FrameRequestCallback): number => ++_rafId;
global.cancelAnimationFrame = (_id: number): void => {};
