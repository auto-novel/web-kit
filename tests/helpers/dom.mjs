import { after } from 'node:test';
import { JSDOM } from 'jsdom';

// Import Vue dynamically after this helper so runtime-dom captures this document.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
for (const key of [
  'window',
  'document',
  'history',
  'location',
  'Document',
  'ShadowRoot',
  'Element',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'SVGElement',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'CustomEvent',
  'Event',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
])
  globalThis[key] = key === 'window' ? dom.window : dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
  dom.window,
);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
  dom.window,
);
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// jsdom has no layout/scrolling implementation; Reka scrolls highlighted items.
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.PointerEvent = dom.window.PointerEvent ?? dom.window.MouseEvent;
dom.window.PointerEvent = globalThis.PointerEvent;
after(() => dom.window.close());
export { dom };
