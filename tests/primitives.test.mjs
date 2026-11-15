import assert from 'node:assert/strict';
import { test } from 'node:test';

import { JSDOM } from 'jsdom';
import { h } from 'vue';
import {
  createComponentServer,
  renderWithRouter as renderToString,
} from './helpers/component-server.mjs';

const server = await createComponentServer();

async function component(path) {
  return (await server.ssrLoadModule(`/src/ui/${path}.vue`)).default;
}

test('Time merges caller classes without changing its native time element or empty-value behavior', async () => {
  const Time = await component('time/XTime');
  const App = (await server.ssrLoadModule('@nuxt/ui/components/App.vue')).default;
  const renderTime = (props) =>
    renderToString(h(App, { toaster: null }, () => h(Time, props)));
  const html = await renderTime({
    time: '2025-01-01T12:00:00Z',
    class: ['text-sm', { 'text-lg': true }],
    style: { opacity: 0.8 },
    'aria-label': 'Published at',
  });
  assert.match(html, /<time\b/);
  assert.match(html, /data-state="closed"/);
  assert.doesNotMatch(html, /\stitle=/);
  assert.match(html, /class="text-lg"/);
  assert.match(html, /datetime="2025-01-01T/);
  assert.match(html, /opacity:0.8/);
  assert.match(html, /aria-label="Published at"/);
  const disabledHtml = await renderTime({
    time: '2025-01-01T12:00:00Z',
    title: '',
  });
  assert.match(disabledHtml, /<time\b/);
  assert.doesNotMatch(disabledHtml, /\stitle=/);
  for (const time of [null, 'invalid']) {
    assert.doesNotMatch(await renderTime({ time }), /<time\b/);
  }
});

test('Pagination maps navigation and page regions without leaking ui to the DOM', async () => {
  const Pagination = await component('pagination/XPagination');
  const html = await renderToString(
    h(Pagination, {
      page: 2,
      totalPages: 5,
      class: 'pager-root px-8',
      'aria-label': 'Search results pages',
      ui: {
        root: 'px-2',
        list: 'pager-list gap-3',
        prev: 'pager-prev px-10',
        next: 'pager-next px-12',
        item: 'pager-item text-base',
      },
    }),
  );
  const region = (marker) =>
    html.match(new RegExp(`<[^>]+class="[^"]*${marker}[^>]*>`))[0];
  assert.match(region('pager-root'), /px-8/);
  assert.match(region('pager-root'), /aria-label="Search results pages"/);
  assert.doesNotMatch(region('pager-root'), /(?:^|\s)px-[24](?:\s|")|\sui=/);
  assert.match(region('pager-list'), /gap-3/);
  assert.doesNotMatch(region('pager-list'), /gap-1/);
  assert.match(region('pager-prev'), /px-10/);
  assert.match(region('pager-next'), /px-12/);
  assert.match(region('pager-item'), /text-base/);
  assert.doesNotMatch(region('pager-item'), /text-xs/);
});

test('Pagination marks the current page and provides accessible boundary navigation', async () => {
  const Pagination = await component('pagination/XPagination');
  for (const page of [1, 10, 20]) {
    const html = await renderToString(
      h(Pagination, { page, totalPages: 20, ui: { list: 'pager-list' } }),
    );
    const document = new JSDOM(html).window.document;
    const list = document.querySelector('.pager-list');
    assert.equal(
      list.querySelector('[aria-current="page"]').textContent.trim(),
      String(page),
    );
    assert.ok(list.querySelector('[aria-label="跳转到指定页"]'));
    assert.equal(document.querySelector('[data-pagination-summary]'), null);

    for (const [label, disabled] of [
      ['上一页', page === 1],
      ['下一页', page === 20],
    ]) {
      const button = document.querySelector(`button[aria-label="${label}"]`);
      assert.equal(button.disabled, disabled);
      const icon = button.querySelector('svg');
      assert.equal(icon.getAttribute('aria-hidden'), 'true');
      const text = button.querySelector('span');
      assert.equal(text.textContent, label);
    }
  }
});

test('Pagination keeps Reka internals out of root attrs', async () => {
  const Pagination = await component('pagination/XPagination');
  const html = await renderToString(
    h(Pagination, {
      page: 2,
      totalPages: 5,
      as: 'div',
      'items-per-page': 2,
      disabled: true,
      ui: { root: 'pager-root', list: 'pager-list' },
    }),
  );
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelector('.pager-root').tagName, 'NAV');
  assert.equal(
    document.querySelectorAll('.pager-list [data-type="page"]').length,
    5,
  );
  assert.equal(document.querySelector('[aria-current="page"]').disabled, false);
});
