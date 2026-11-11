import assert from 'node:assert/strict';
import test from 'node:test';
import * as Vue from 'vue';
import { renderWithRouter as renderToString } from '../helpers/component-server.mjs';
import * as classes from '../../src/ui/classes.ts';
import { compileComponent } from '../helpers/compile-component.mjs';

const icon = (_, { attrs }) => Vue.h('svg', attrs);
const dependencies = {
  vue: Vue,
  '../classes': classes,
  '@vicons/material': {
    CheckOutlined: icon,
    ExpandMoreOutlined: icon,
    DriveFolderUploadOutlined: icon,
  },
};
function component(path, overrides = {}) {
  return compileComponent(
    new URL(`../../src/ui/${path}.vue`, import.meta.url),
    {
      ...dependencies,
      ...overrides,
    },
  );
}
function node(html, marker) {
  const tag = html.match(
    new RegExp(`<[^>]+class="[^"]*\\b${marker}\\b[^"]*"[^>]*>`),
  )?.[0];
  assert.ok(tag, `Missing styled region: ${marker}\n${html}`);
  return tag;
}
function classTokens(tag) {
  return tag.match(/class="([^"]*)"/)[1].split(/\s+/);
}
function styles(tag, included, excluded = []) {
  const tokens = classTokens(tag);
  for (const value of included)
    assert.ok(tokens.includes(value), `Missing ${value}: ${tag}`);
  for (const value of excluded)
    assert.ok(!tokens.includes(value), `Unexpected ${value}: ${tag}`);
}

test('active DropZone maps overlay/content/icon/description and keeps class last', async () => {
  const DropZone = component('drop-zone/XDropZone', {
    // Bypass only Teleport and the browser drag state so the actual active SFC renders in SSR.
    vue: { ...Vue, Teleport: Vue.Fragment },
    './useFileDrop': { useFileDrop: () => ({ active: Vue.ref(true) }) },
  });
  const html = await renderToString(
    Vue.h(DropZone, {
      class: ['drop-overlay p-8', { 'bg-error': true }],
      style: { opacity: 0.8 },
      'aria-label': 'Upload files',
      ui: {
        overlay: 'p-2 bg-primary sm:p-6',
        content: 'drop-content p-3 border-primary text-base',
        icon: 'drop-icon size-6',
        description: ['drop-description', { 'font-semibold': true }],
      },
    }),
  );
  const overlay = node(html, 'drop-overlay');
  styles(
    overlay,
    ['p-8', 'bg-error', 'sm:p-6'],
    ['p-4', 'p-2', 'bg-black/70', 'bg-primary', 'sm:p-10'],
  );
  assert.match(overlay, /role="status"/);
  assert.match(overlay, /aria-label="Upload files"/);
  assert.match(overlay, /opacity:0.8/);
  // DropZone alone has an explicit top layer; dialogs use body portal order.
  styles(overlay, ['z-[200]']);
  styles(
    node(html, 'drop-content'),
    ['p-3', 'border-primary', 'text-base', 'sm:text-2xl'],
    ['p-6', 'border-white/70', 'text-xl'],
  );
  styles(node(html, 'drop-icon'), ['size-6'], ['size-12']);
  styles(node(html, 'drop-description'), ['font-semibold']);
  assert.match(html, /松开以接收文件/);
});
