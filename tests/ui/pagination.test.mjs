import assert from 'node:assert/strict';
import test from 'node:test';

import { dom } from '../helpers/dom.mjs';

// Real DOM events verify keyboard scope and the page-jump lifecycle.
const Vue = await import('vue');
const { createComponentServer, installTestRouter } =
  await import('../helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const { default: XPagination } = await server.ssrLoadModule(
  '/src/ui/pagination/XPagination.vue',
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
  installTestRouter(app);
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

test('Pagination 键盘翻到边界后将焦点从禁用按钮恢复到当前页', async (t) => {
  const { host, props } = await mount(t, {
    page: 2,
    totalPages: 5,
    keyboard: true,
  });
  const previous = host.querySelector('button[aria-label="上一页"]');
  const rects = dom.window.HTMLElement.prototype.getClientRects;
  dom.window.HTMLElement.prototype.getClientRects = () => [
    { width: 32, height: 32 },
  ];
  t.after(() => {
    dom.window.HTMLElement.prototype.getClientRects = rects;
  });

  previous.focus();
  press(previous, 'ArrowLeft');
  await Vue.nextTick();
  assert.equal(props.page, 1);
  assert.equal(previous.disabled, true);
  assert.equal(
    document.activeElement,
    host.querySelector('[aria-current="page"]'),
  );
});

test('Pagination 拒绝无效跳页，Escape 关闭浮层并恢复焦点', async (t) => {
  const { host, props, events } = await mount(t);
  const trigger = host.querySelector('button[aria-label="跳转到指定页"]');
  trigger.focus();
  trigger.click();
  await settle();

  const dialog = document.querySelector('[role="dialog"]');
  assert.equal(dialog.getAttribute('aria-label'), '跳转到指定页');
  const input = dialog.querySelector('input[aria-label="跳转页码"]');
  const submit = dialog.querySelector('button');
  assert.equal(document.activeElement, input);
  assert.equal(input.getAttribute('role'), 'spinbutton');
  assert.equal(input.getAttribute('aria-valuemin'), '1');
  assert.equal(input.getAttribute('aria-valuemax'), '20');
  for (const value of ['0', '21', '1.5', '3.0001', '2', '', 'abc']) {
    input.value = value;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await Vue.nextTick();
    assert.equal(submit.disabled, true);
    press(input, 'Enter');
    assert.equal(props.page, 2);
    assert.deepEqual(events, []);
  }
  press(input, 'Escape');
  await settle();
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, trigger);
});

test('Pagination 数值跳页支持方向键、禁用滚轮，点击提交未失焦的最新草稿', async (t) => {
  const { host, props, events } = await mount(t, {
    totalPages: 2000,
  });
  const trigger = host.querySelector('button[aria-label="跳转到指定页"]');
  trigger.click();
  await settle();
  const dialog = document.querySelector('[role="dialog"]');
  const input = dialog.querySelector('input[aria-label="跳转页码"]');
  const submit = dialog.querySelector('button');
  assert.equal(submit.disabled, true, '当前页不能跳转');

  press(input, 'ArrowUp');
  await Vue.nextTick();
  assert.equal(input.value, '3');
  assert.equal(submit.disabled, false);
  assert.deepEqual(events, [], '方向键只改变待跳转页码');
  input.dispatchEvent(
    new dom.window.WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true,
      cancelable: true,
    }),
  );
  await Vue.nextTick();
  assert.equal(input.value, '3');

  for (const value of ['', '2001', '4.5']) {
    input.value = value;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await Vue.nextTick();
    assert.equal(submit.disabled, true, '新草稿无效时不能提交旧模型');
    input.blur();
    await Vue.nextTick();
    assert.equal(submit.disabled, true, '失焦不能把非法值修正后提交');
    input.focus();
  }

  input.value = '1234';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await Vue.nextTick();
  assert.equal(submit.disabled, false);
  assert.equal(input.value, '1234', '页码不使用千位分隔');
  // 程序化点击不会触发 blur，确保不依赖失焦提交模型。
  submit.click();
  assert.equal(props.page, 1234);
  await settle();
  assert.equal(document.querySelector('[role="dialog"]'), null);

  trigger.click();
  await settle();
  assert.equal(
    document.querySelector('input[aria-label="跳转页码"]').value,
    '1234',
  );
  assert.equal(document.querySelector('[role="dialog"] button').disabled, true);
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
  // 不等待失焦或下一次渲染，Enter 也必须提交当前输入而非旧模型。
  press(input, 'Enter');
  assert.equal(props.page, 7);
  await settle();
  assert.equal(document.querySelector('[role="dialog"]'), null);
});
