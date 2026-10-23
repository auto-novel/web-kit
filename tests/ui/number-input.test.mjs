import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { JSDOM } from 'jsdom';
import { compileComponent } from '../helpers/compile-component.mjs';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
for (const key of [
  'window',
  'document',
  'Element',
  'HTMLElement',
  'SVGElement',
])
  globalThis[key] = key === 'window' ? dom.window : dom.window[key];
after(() => dom.window.close());

const Vue = await import('vue');
const reka = await import('reka-ui');
const XNumberInput = compileComponent(
  new URL('../../src/ui/number-input/XNumberInput.vue', import.meta.url),
  {
    vue: Vue,
    'reka-ui': reka,
    '../classes': await import('../../src/ui/classes.ts'),
    '../field': await import('../../src/ui/field.ts'),
  },
);

function mount(t, initial = {}) {
  const props = Vue.reactive({ ...initial });
  const events = [];
  const component = Vue.ref();
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(XNumberInput, {
        ...props,
        ref: component,
        'onUpdate:modelValue': (value) => {
          events.push(value);
          props.modelValue = value;
        },
      }),
  });
  app.mount(host);
  t.after(() => {
    app.unmount();
    host.remove();
  });
  const input = host.querySelector('input');
  const dispatch = (type, init = {}) => {
    const Constructor =
      type === 'keydown' ? dom.window.KeyboardEvent : dom.window.Event;
    const event = new Constructor(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    input.dispatchEvent(event);
    return event;
  };
  const enter = async (value) => {
    input.value = value;
    dispatch('input');
    dispatch('blur');
    await Vue.nextTick();
  };
  return {
    root: host.firstElementChild,
    input,
    props,
    events,
    component,
    dispatch,
    enter,
  };
}

test('NumberInput 原生属性/事件落 input，样式分流、覆盖和焦点方法有效', async (t) => {
  const received = [];
  const { root, input, props, component } = mount(t, {
    id: 'amount',
    placeholder: '数量',
    'aria-label': '数量',
    'aria-invalid': 'grammar',
    onFocus: (event) => received.push(event),
    class: 'w-48 px-8',
    style: { marginTop: '4px' },
    size: 'sm',
    ui: { root: 'rounded-lg', input: 'py-3' },
  });
  assert.equal(root.id, '');
  assert.equal(root.style.marginTop, '4px');
  assert.ok(root.classList.contains('w-48'));
  assert.ok(root.classList.contains('px-8'));
  assert.ok(!root.classList.contains('px-2.5'));
  assert.ok(root.classList.contains('rounded-lg'));
  assert.ok(root.classList.contains('min-h-9'));
  for (const [key, value] of Object.entries({
    id: 'amount',
    placeholder: '数量',
    'aria-label': '数量',
  }))
    assert.equal(input.getAttribute(key), value);
  assert.equal(input.style.marginTop, '');
  assert.ok(input.classList.contains('py-3'));
  assert.ok(!input.classList.contains('py-1.5'));
  assert.equal(input.getAttribute('aria-invalid'), 'grammar');
  props.invalid = true;
  await Vue.nextTick();
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  component.value.focus();
  assert.equal(document.activeElement, input);
  assert.equal(received.length, 1);
  component.value.blur();
  assert.notEqual(document.activeElement, input);
});

test('NumberInput name 在表单中提交数值，不提交格式化文本', async (t) => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h('form', {}, [
        Vue.h(XNumberInput, { modelValue: 1234.5, name: 'amount' }),
      ]),
  });
  app.mount(host);
  t.after(() => {
    app.unmount();
    host.remove();
  });
  await Vue.nextTick();

  const form = host.querySelector('form');
  // Reka 只在根节点拿到 name 时渲染数值字段；可见输入框保留格式化显示。
  assert.equal(form.querySelectorAll('input[name="amount"]').length, 1);
  assert.equal(new dom.window.FormData(form).get('amount'), '1234.5');
  assert.equal(form.querySelector('input[role="spinbutton"]').name, '');
});

test('NumberInput 默认空值、清空和外部 null 一致，整数步长提交时取整并限制范围', async (t) => {
  const { input, props, events, enter } = mount(t, { min: 0, max: 10 });
  assert.equal(input.value, '');
  assert.deepEqual(events, []);
  await enter('2.6');
  assert.equal(props.modelValue, 3);
  await enter('20');
  assert.equal(props.modelValue, 10);
  await enter('');
  assert.equal(props.modelValue, null);
  assert.equal(input.value, '');
  assert.deepEqual(events, [3, 10, null]);
  props.modelValue = 5;
  await Vue.nextTick();
  assert.equal(input.value, '5');
  props.modelValue = null;
  await Vue.nextTick();
  assert.equal(input.value, '');
});

test('NumberInput 小数步长与键盘操作有效，滚轮不改值也不阻止页面滚动', async (t) => {
  const { input, props, enter, dispatch } = mount(t, {
    modelValue: 0.2,
    step: 0.1,
  });
  await enter('0.3');
  assert.equal(props.modelValue, 0.3);
  dispatch('keydown', { key: 'ArrowUp' });
  await Vue.nextTick();
  assert.equal(props.modelValue, 0.4);
  input.focus();
  const wheel = new dom.window.WheelEvent('wheel', {
    deltaY: 100,
    cancelable: true,
  });
  input.dispatchEvent(wheel);
  await Vue.nextTick();
  assert.equal(props.modelValue, 0.4);
  assert.equal(wheel.defaultPrevented, false);
});

test('NumberInput disabled/readonly 保持原生状态并拒绝键盘修改', async (t) => {
  const { input, props, events, dispatch } = mount(t, {
    modelValue: 4,
    min: 0,
    max: 10,
  });
  for (const state of ['disabled', 'readonly']) {
    props[state] = true;
    await Vue.nextTick();
    assert.equal(input[state === 'readonly' ? 'readOnly' : state], true);
    for (const key of ['ArrowUp', 'Home', 'End']) dispatch('keydown', { key });
    await Vue.nextTick();
    assert.deepEqual(events, []);
    assert.equal(props.modelValue, 4);
    props[state] = false;
    await Vue.nextTick();
  }
});
