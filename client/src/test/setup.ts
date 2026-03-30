import "@testing-library/jest-dom/vitest";
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: any = null;
  rootMargin = '';
  thresholds = [];
  takeRecords() { return [] }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Web Animations API
if (!HTMLElement.prototype.animate) {
  HTMLElement.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
    onfinish: null,
  });
}

// Mock getAnimations
if (!HTMLElement.prototype.getAnimations) {
  HTMLElement.prototype.getAnimations = vi.fn().mockReturnValue([]);
}

// Mock DOMMatrix
global.DOMMatrix = class {
  is2D = true;
  isIdentity = true;
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  m11 = 1; m12 = 0; m13 = 0; m14 = 0;
  m21 = 0; m22 = 1; m23 = 0; m24 = 0;
  m31 = 0; m32 = 0; m33 = 1; m34 = 0;
  m41 = 0; m42 = 0; m43 = 0; m44 = 1;
  translate() { return this; }
  scale() { return this; }
  rotate() { return this; }
  multiply() { return this; }
  invertSelf() { return this; }
} as any;

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();
