import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { JSDOM } from 'jsdom';
import { compileComponent } from '../helpers/compile-component.mjs';

// 用真实 Reka、Portal 和 DOM 事件验证选择流程，而非手动发送组件事件。
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
});
for (const key of [
  'window',
  'document',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'CustomEvent',
  'Event',
  'HTMLInputElement',
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
const icon = () => Vue.h('svg');
const XDateRangePicker = compileComponent(
  new URL(
    '../../src/ui/date-range-picker/XDateRangePicker.vue',
    import.meta.url,
  ),
  {
    vue: Vue,
    'reka-ui': await import('reka-ui'),
    '@internationalized/date': await import('@internationalized/date'),
    '@vicons/material': {
      CalendarMonthOutlined: icon,
      ChevronLeftOutlined: icon,
      ChevronRightOutlined: icon,
      CloseOutlined: icon,
    },
    '../classes': await import('../../src/ui/classes.ts'),
    '../field': await import('../../src/ui/field.ts'),
    '../overlayLayer': await import('../../src/ui/overlayLayer.ts'),
  },
);

async function settle() {
  await Vue.nextTick();
  // FocusScope/Presence 与 Popper 使用 RAF 及下一宏任务更新焦点和内容。
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
}

function mount(t, initial = {}) {
  const props = Vue.reactive({ ...initial });
  const events = [];
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(XDateRangePicker, {
        ...props,
        'onUpdate:modelValue': (value) => {
          props.modelValue = value;
          events.push(value);
        },
      }),
  });
  app.mount(host);
  t.after(async () => {
    app.unmount();
    host.remove();
    await settle();
  });
  const trigger = host.querySelector('button');
  const content = () => document.querySelector('[role="dialog"]');
  const day = (value) =>
    content()?.querySelector(
      `[data-value="${value}"]:not([data-outside-view])`,
    );
  // jsdom 的 click() 不会像浏览器那样先聚焦元素；Reka 依赖 focus 更新高亮区间。
  const clickDay = (value) => {
    const target = day(value);
    assert.ok(target, `缺少日期 ${value}`);
    target.focus();
    target.click();
  };
  const open = async () => {
    trigger.focus();
    trigger.click();
    await settle();
    assert.ok(content(), '真实 Portal 应打开日期弹层');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.ok(
      content().querySelector('[aria-label^="日期区间"]'),
      '日历应使用中文可访问名称',
    );
  };
  return { host, trigger, content, day, clickDay, open, props, events };
}

test('DateRangePicker 真实点击两天只提交完整 ISO 区间，完成后关闭并可清空', async (t) => {
  const { host, trigger, content, clickDay, open, events, props } = mount(t, {
    modelValue: ['2026-10-01', '2026-10-03'],
    clearable: true,
  });
  await open();
  clickDay('2026-10-20');
  await settle();
  assert.deepEqual(events, []);
  assert.ok(content(), '首个日期不能提前关闭弹层');
  clickDay('2026-10-23');
  await settle();
  assert.deepEqual(events, [['2026-10-20', '2026-10-23']]);
  assert.deepEqual(props.modelValue, ['2026-10-20', '2026-10-23']);
  assert.equal(content(), null);
  assert.match(trigger.textContent, /2026-10-20 至 2026-10-23/);
  host.querySelector('[aria-label="清空日期区间"]').click();
  await settle();
  assert.deepEqual(events, [['2026-10-20', '2026-10-23'], null]);
  assert.equal(props.modelValue, null);
  assert.match(trigger.textContent, /选择日期区间/);
});

test('DateRangePicker readonly 仍可打开查看，但点击日期不提交', async (t) => {
  const { trigger, content, clickDay, open, events } = mount(t, {
    modelValue: ['2026-10-01', '2026-10-03'],
    readonly: true,
  });
  assert.equal(trigger.disabled, false);
  await open();
  clickDay('2026-10-20');
  await settle();
  assert.deepEqual(events, []);
  assert.ok(content(), '只读日历不应因点击日期关闭');
});

test('DateRangePicker Escape 取消未完成选择并恢复触发器焦点，重开保留已提交范围', async (t) => {
  const { trigger, content, day, clickDay, open, events } = mount(t, {
    modelValue: ['2026-10-01', '2026-10-03'],
  });
  await open();
  clickDay('2026-10-20');
  await settle();
  content().dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle();
  assert.equal(content(), null);
  assert.equal(document.activeElement, trigger);
  assert.deepEqual(events, []);
  await open();
  assert.ok(day('2026-10-01').hasAttribute('data-selection-start'));
  assert.ok(day('2026-10-03').hasAttribute('data-selection-end'));
  assert.ok(!day('2026-10-20').hasAttribute('data-selection-start'));
});

test('DateRangePicker min/max 禁止范围外日期点击提交', async (t) => {
  const { content, day, clickDay, open, events } = mount(t, {
    modelValue: ['2026-10-10', '2026-10-15'],
    min: '2026-10-05',
    max: '2026-10-25',
  });
  await open();
  for (const date of ['2026-10-04', '2026-10-26']) {
    assert.ok(day(date).hasAttribute('data-disabled'));
    clickDay(date);
    await settle();
  }
  assert.deepEqual(events, []);
  assert.ok(content());
});
