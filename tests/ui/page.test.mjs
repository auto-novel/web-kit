import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';

import * as classes from '../../src/ui/classes.ts';
import { compileComponent } from '../helpers/compile-component.mjs';

const dependencies = { vue: Vue, '../classes': classes };
const XPage = compileComponent(
  new URL('../../src/ui/page/XPage.vue', import.meta.url),
  dependencies,
);
const XPageHeader = compileComponent(
  new URL('../../src/ui/page/XPageHeader.vue', import.meta.url),
  dependencies,
);

async function render(component, props, slots) {
  const html = await renderToString(Vue.h(component, props, slots));
  return new JSDOM(html).window.document.body;
}

test('Page renders a single-column div, forwards root attributes and merges class overrides once', async () => {
  const body = await render(
    XPage,
    {
      id: 'books',
      class: ['max-w-3xl', { 'px-5': true, 'pb-12': true }],
      style: { paddingBottom: '64px' },
      'aria-label': '书架',
    },
    { default: () => Vue.h('p', '正文') },
  );
  const root = body.firstElementChild;
  assert.equal(root.tagName, 'DIV');
  assert.equal(root.id, 'books');
  assert.equal(root.getAttribute('aria-label'), '书架');
  assert.equal(root.style.paddingBottom, '64px');
  assert.equal(root.className.split('max-w-3xl').length - 1, 1);
  assert.ok(!root.classList.contains('max-w-5xl'));
  assert.ok(root.classList.contains('px-5'));
  assert.ok(!root.classList.contains('px-3'));
  assert.ok(root.classList.contains('pt-6'));
  assert.ok(root.classList.contains('pb-12'));
  assert.ok(!root.classList.contains('pb-6'));
  assert.equal(body.querySelector('main, aside'), null);
  assert.ok(root.firstElementChild.classList.contains('flex'));
  assert.ok(
    root.firstElementChild.firstElementChild.classList.contains('flex-1'),
  );
  assert.equal(body.querySelector('p').textContent, '正文');
});

test('Page adds the optional aside without duplicating body or header content', async () => {
  const body = await render(
    XPage,
    {},
    {
      default: () => [
        Vue.h(XPageHeader, { title: '我的收藏' }),
        Vue.h('p', '收藏列表'),
      ],
      aside: () => Vue.h('nav', { 'aria-label': '收藏夹' }, '目录'),
    },
  );
  const aside = body.querySelector('aside');
  assert.ok(aside.classList.contains('@4xl/x-page:flex'));
  assert.ok(aside.classList.contains('w-80'));
  assert.ok(aside.classList.contains('shrink-0'));
  assert.equal(body.querySelectorAll('h1').length, 1);
  assert.equal(body.querySelectorAll('aside').length, 1);
  assert.equal(
    body.querySelector('aside nav').getAttribute('aria-label'),
    '收藏夹',
  );
  assert.equal(body.querySelector('aside').textContent, '目录');
  assert.equal(body.querySelector('main'), null);
});

test('PageHeader renders title, optional description and actions with root attrs and overrides', async () => {
  const minimal = await render(XPageHeader, { title: '设置' });
  assert.equal(minimal.firstElementChild.tagName, 'HEADER');
  assert.ok(minimal.firstElementChild.classList.contains('mb-6'));
  assert.ok(!minimal.firstElementChild.classList.contains('mt-6'));
  assert.equal(minimal.querySelector('h1').textContent, '设置');
  assert.equal(minimal.querySelector('p'), null);
  assert.equal(minimal.firstElementChild.children.length, 1);

  const body = await render(
    XPageHeader,
    {
      title: '<工作区>',
      description: '翻译任务',
      id: 'heading',
      class: 'my-2',
    },
    { actions: () => Vue.h('button', { type: 'button' }, '添加') },
  );
  const root = body.firstElementChild;
  assert.equal(root.id, 'heading');
  assert.ok(root.classList.contains('my-2'));
  assert.ok(!root.classList.contains('mb-6'));
  assert.equal(root.getAttribute('title'), null);
  assert.equal(root.querySelector('h1').textContent, '<工作区>');
  assert.equal(root.querySelector('p').textContent, '翻译任务');
  assert.equal(root.querySelector('button').textContent, '添加');
});
