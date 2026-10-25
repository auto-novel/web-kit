import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import { JSDOM } from 'jsdom';

import { compileComponent } from '../helpers/compile-component.mjs';

// 用真实 Reka 与 DOM 事件验证键盘作用域和跳页流程，而非手动发送组件事件。
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
});
for (const key of [
  'window',
  'document',
  'Document',
  'ShadowRoot',
  'Element',
  'HTMLElement',
  'HTMLInputElement',
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
globalThis.PointerEvent = dom.window.PointerEvent ?? dom.window.MouseEvent;
dom.window.PointerEvent = globalThis.PointerEvent;
after(() => dom.window.close());

const Vue = await import('vue');
const Reka = await import('reka-ui');
const VueUse = await import('@vueuse/core');
const styleClasses = await import('../../src/ui/classes.ts');
const buttonVariants = await import('../../src/ui/button/variants.ts');
const overlayLayer = await import('../../src/ui/overlayLayer.ts');
const keyboard = await import('../../src/ui/pagination/keyboard.ts');

const icon = () => Vue.h('svg');
const XButton = compileComponent(
  new URL('../../src/ui/button/XButton.vue', import.meta.url),
  {
    vue: Vue,
    '../classes': styleClasses,
    './variants': buttonVariants,
  },
);
const PageJump = compileComponent(
  new URL('../../src/ui/pagination/PageJump.vue', import.meta.url),
  {
    vue: Vue,
    'reka-ui': Reka,
    '../button/XButton.vue': XButton,
    '../classes': styleClasses,
    '../overlayLayer': overlayLayer,
  },
);
const XPagination = compileComponent(
  new URL('../../src/ui/pagination/XPagination.vue', import.meta.url),
  {
    vue: Vue,
    'reka-ui': Reka,
    '@vueuse/core': VueUse,
    '@vicons/material': {
      ChevronLeftOutlined: icon,
      ChevronRightOutlined: icon,
    },
    '../button/XButton.vue': XButton,
    '../classes': styleClasses,
    './keyboard': keyboard,
    './PageJump.vue': PageJump,
  },
);

async function settle() {
  await Vue.nextTick();
  // FocusScope/Presence 与 Popper 使用 RAF 及下一宏任务更新焦点和内容。
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
}

async function mount(t, initial = {}, { dialog = false, scope = false } = {}) {
  const host = document.createElement('div');
  const container = document.createElement('div');
  host.append(container);
  document.body.append(host);

  let parent = container;
  if (dialog) {
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', '分页容器');
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    container.append(toolbar);
    parent = toolbar;
  }

  const region = scope ? document.createElement('div') : null;
  if (region) {
    region.tabIndex = 0;
    parent.append(region);
    parent = region;
  }

  const props = Vue.reactive({ page: 2, totalPages: 20, ...initial });
  const events = [];
  const app = Vue.createApp({
    render: () =>
      Vue.h(XPagination, {
        ...props,
        'onUpdate:page': (value) => {
          props.page = value;
          events.push(value);
        },
      }),
  });
  app.mount(parent);
  await Vue.nextTick();
  t.after(async () => {
    app.unmount();
    host.remove();
    await settle();
  });

  return { host, container, region, props, events };
}

function press(target, key = 'ArrowRight') {
  target.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    }),
  );
}

test('Pagination 键盘只在分页内翻页，且不被所在 dialog/toolbar 阻断', async (t) => {
  const local = await mount(t, { page: 2, totalPages: 5, keyboard: true });
  local.props['aria-label'] = '动态分页';
  await Vue.nextTick();
  assert.equal(local.host.querySelector('nav').ariaLabel, '动态分页');

  const current = local.host.querySelector('[data-type="page"][aria-current]');
  current.focus();
  press(current);
  assert.equal(local.props.page, 3);

  document.body.focus();
  press(document.body);
  assert.equal(local.props.page, 3);

  const nested = await mount(
    t,
    { page: 2, totalPages: 5, keyboard: true },
    { dialog: true },
  );
  const nestedCurrent = nested.host.querySelector(
    '[data-type="page"][aria-current]',
  );
  nestedCurrent.focus();
  press(nestedCurrent);
  assert.equal(nested.props.page, 3);
});

test('Pagination 的 keyboard 联合类型扩展到容器或页面', async (t) => {
  const scoped = await mount(t, { page: 2, totalPages: 5 }, { scope: true });
  scoped.props.keyboard = scoped.region;
  await Vue.nextTick();

  const input = document.createElement('input');
  scoped.region.append(input);
  input.focus();
  press(input);
  assert.equal(scoped.props.page, 2);

  const item = document.createElement('button');
  scoped.region.append(item);
  item.focus();
  press(item);
  assert.equal(scoped.props.page, 3);

  const global = await mount(t, { page: 2, totalPages: 5, keyboard: 'window' });
  const outside = document.createElement('button');
  global.host.append(outside);
  outside.focus();
  press(outside);
  assert.equal(global.props.page, 3);

  const outsideInput = document.createElement('input');
  global.host.append(outsideInput);
  outsideInput.focus();
  press(outsideInput);
  assert.equal(global.props.page, 3);
});

test('Pagination 跳页浮层让出快捷键并在跳转后关闭', async (t) => {
  const { host, props } = await mount(t, {
    page: 2,
    totalPages: 20,
    keyboard: true,
  });
  const trigger = host.querySelector('button[aria-label="跳转到指定页"]');
  trigger.focus();
  trigger.click();
  await settle();

  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog, '省略号应打开跳页面板');
  press(trigger);
  assert.equal(props.page, 2, '浮层打开时不应翻页');

  const input = dialog.querySelector('input[aria-label="跳转页码"]');
  input.value = '7';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  input.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(props.page, 7);
  await settle();
  assert.equal(document.querySelector('[role="dialog"]'), null);
});
