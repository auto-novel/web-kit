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
  const html = await renderToString(
    h(Time, {
      time: '2025-01-01T12:00:00Z',
      class: ['text-sm', { 'text-lg': true }],
      style: { opacity: 0.8 },
      'aria-label': 'Published at',
    }),
  );
  assert.match(html, /^<time\b/);
  assert.match(html, /class="text-lg"/);
  assert.match(html, /datetime="2025-01-01T/);
  assert.match(html, /opacity:0.8/);
  assert.match(html, /aria-label="Published at"/);
  assert.doesNotMatch(await renderToString(h(Time, { time: null })), /<time\b/);
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

test('Pagination shares page buttons across screen sizes and uses accessible mobile arrows', async () => {
  const Pagination = await component('pagination/XPagination');
  for (const page of [1, 10, 20]) {
    const html = await renderToString(
      h(Pagination, { page, totalPages: 20, ui: { list: 'pager-list' } }),
    );
    const document = new JSDOM(html).window.document;
    const list = document.querySelector('.pager-list');
    assert.ok(list.classList.contains('flex'));
    assert.ok(!list.classList.contains('hidden'));
    assert.ok(!list.classList.contains('sm:flex'));
    assert.equal(
      list.querySelector('[aria-current="page"]').textContent.trim(),
      String(page),
    );
    assert.ok(list.querySelector('[aria-label="跳转到指定页"]'));
    assert.equal(document.querySelector('[data-pagination-summary]'), null);

    for (const button of list.querySelectorAll('button')) {
      assert.ok(button.classList.contains('justify-center'));
      assert.ok(button.classList.contains('shrink-0'));
      assert.ok(button.classList.contains('size-8'));
      assert.ok(button.classList.contains('p-0'));
      assert.equal(button.classList.contains('p-1.5'), false);
    }

    for (const [label, disabled] of [
      ['上一页', page === 1],
      ['下一页', page === 20],
    ]) {
      const button = document.querySelector(`button[aria-label="${label}"]`);
      assert.equal(button.disabled, disabled);
      assert.ok(button.classList.contains('justify-center'));
      assert.ok(button.classList.contains('shrink-0'));
      const icon = button.querySelector('svg');
      assert.equal(icon.getAttribute('aria-hidden'), 'true');
      assert.ok(icon.classList.contains('sm:hidden'));
      const text = button.querySelector('span');
      assert.equal(text.textContent, label);
      assert.ok(text.classList.contains('hidden'));
      assert.ok(text.classList.contains('sm:inline'));
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
