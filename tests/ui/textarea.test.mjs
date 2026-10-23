import assert from 'node:assert/strict';
import test from 'node:test';
import * as Vue from 'vue';

import * as styleClasses from '../../src/ui/classes.ts';
import * as field from '../../src/ui/field.ts';
import { compileComponent } from '../helpers/compile-component.mjs';
import {
  classes,
  createTestRenderer,
  dispatch,
} from '../helpers/test-renderer.mjs';

const XTextarea = compileComponent(
  new URL('../../src/ui/textarea/XTextarea.vue', import.meta.url),
  { vue: Vue, '../classes': styleClasses, '../field': field },
);

function mount(
  t,
  initial = {},
  { boxSizing = 'border-box', observer = true } = {},
) {
  const { createApp, mount: mountApp, document } = createTestRenderer(t);
  const props = Vue.reactive({ ...initial });
  const events = [];
  let instance;
  let onResize;
  let disconnected = false;
  let removed = false;
  Object.assign(document.defaultView, {
    getComputedStyle: () => ({
      lineHeight: '20px',
      fontSize: '16px',
      paddingTop: '6px',
      paddingBottom: '6px',
      borderTopWidth: '1px',
      borderBottomWidth: '1px',
      boxSizing,
    }),
    ResizeObserver: observer
      ? class {
          constructor(callback) {
            onResize = callback;
          }
          observe() {}
          disconnect() {
            disconnected = true;
          }
        }
      : undefined,
    addEventListener: (_, callback) => {
      onResize = callback;
    },
    removeEventListener: (_, callback) => {
      removed = callback === onResize;
    },
  });
  const { root, unmount } = mountApp(
    createApp({
      render: () =>
        Vue.h(XTextarea, {
          ...props,
          ref: (value) => {
            instance = value;
          },
          'onUpdate:modelValue': (value) => {
            events.push(value);
            props.modelValue = value;
          },
        }),
    }),
  );
  const textarea = root.children.find((node) => node.tag === 'textarea');
  const count = () => root.children.find((node) => node.tag === 'span');
  return {
    root,
    textarea,
    count,
    props,
    events,
    document,
    unmount,
    instance: () => instance,
    resize: (width = 200) => onResize([{ contentRect: { width } }]),
    disconnected: () => disconnected,
    removed: () => removed,
  };
}
const text = (node) => (node.text ?? '') + node.children.map(text).join('');

test('Textarea 将原生属性/事件交给 textarea，class/style 保留在 root', async (t) => {
  const focus = [];
  const { root, textarea, props, instance, document } = mount(t, {
    id: 'bio',
    name: 'bio',
    maxlength: 12,
    rows: 4,
    placeholder: '简介',
    'aria-label': '简介',
    'aria-invalid': 'grammar',
    onFocus: (event) => focus.push(event),
    class: 'w-64 px-8',
    style: { marginTop: '4px' },
    size: 'sm',
    ui: { root: 'rounded-lg', textarea: 'py-3', count: 'text-primary' },
  });
  assert.equal(root.props.id, undefined);
  assert.deepEqual(root.props.style, { marginTop: '4px' });
  assert.ok(classes(root).includes('px-8'));
  assert.ok(!classes(root).includes('px-2.5'));
  assert.ok(classes(root).includes('rounded-lg'));
  assert.ok(classes(textarea).includes('py-3'));
  assert.ok(!classes(textarea).includes('px-8'));
  for (const [key, value] of Object.entries({
    id: 'bio',
    name: 'bio',
    maxlength: 12,
    rows: 4,
    placeholder: '简介',
    'aria-label': '简介',
    'aria-invalid': 'grammar',
  }))
    assert.equal(textarea.props[key], value);
  assert.deepEqual(focus, []);
  assert.equal(dispatch(textarea, 'focus'), focus[0]);
  instance().focus();
  assert.equal(document.activeElement, textarea);
  instance().blur();
  assert.equal(document.activeElement, null);
  let selected = false;
  textarea.select = () => {
    selected = true;
  };
  instance().select();
  assert.equal(selected, true);
  props.invalid = props.disabled = props.readonly = true;
  await Vue.nextTick();
  assert.equal(textarea.props['aria-invalid'], true);
  assert.equal(textarea.props.disabled, true);
  assert.equal(textarea.props.readonly, true);
  assert.ok(classes(root).includes('border-error'));
});

test('Textarea 字符串模型、外部更新和 IME 使用原生行为，maxlength 不裁剪模型', async (t) => {
  const { textarea, props, events } = mount(t, { maxlength: 2 });
  assert.equal(textarea.value, '');
  textarea.value = '001';
  dispatch(textarea, 'input');
  await Vue.nextTick();
  assert.deepEqual(events, ['001']);
  props.modelValue = '外部超过限制';
  await Vue.nextTick();
  assert.equal(textarea.value, '外部超过限制');
  dispatch(textarea, 'compositionstart');
  textarea.value = 'zhong';
  dispatch(textarea, 'input');
  await Vue.nextTick();
  assert.equal(events.length, 1);
  textarea.value = '中文';
  dispatch(textarea, 'compositionend');
  await Vue.nextTick();
  assert.deepEqual(events, ['001', '中文']);
});

test('Textarea 计数匹配原生 UTF-16 长度，有效 maxlength 才展示上限', async (t) => {
  const { count, props } = mount(t, { modelValue: '😀a' });
  assert.equal(count(), undefined);
  props.showCount = true;
  await Vue.nextTick();
  assert.equal(text(count()), '3');
  props.maxlength = '10';
  await Vue.nextTick();
  assert.equal(text(count()), '3 / 10');
  props.modelValue = '超出';
  props.maxlength = 0;
  await Vue.nextTick();
  assert.equal(text(count()), '2 / 0');
  props.maxlength = -1;
  await Vue.nextTick();
  assert.equal(text(count()), '2');
});

test('autosize 限制行数，外部更新可收缩，宽度改变重测且忽略纯高度回调', async (t) => {
  const { textarea, props, resize, unmount, disconnected } = mount(t, {
    autosize: { minRows: 2, maxRows: 3 },
  });
  assert.equal(textarea.style.height, '74px');
  assert.equal(textarea.style.overflowY, 'auto');
  textarea.scrollHeight = 20;
  props.modelValue = '短';
  await Vue.nextTick();
  assert.equal(textarea.style.height, '54px');
  assert.equal(textarea.style.overflowY, 'hidden');
  textarea.scrollHeight = 66;
  resize(100);
  assert.equal(textarea.style.height, '68px');
  textarea.scrollHeight = 100;
  resize(100);
  assert.equal(textarea.style.height, '68px');
  resize(80);
  assert.equal(textarea.style.height, '74px');
  props.autosize.maxRows = 1; // 无效反向范围按 minRows 处理。
  await Vue.nextTick();
  assert.equal(textarea.style.height, '54px');
  props.autosize = false;
  await Vue.nextTick();
  assert.equal(textarea.style.height, '');
  assert.equal(textarea.style.overflowY, '');
  unmount();
  assert.equal(disconnected(), true);
});

test('autosize 支持 content-box、布尔配置及 window resize 降级并清理监听', async (t) => {
  const { textarea, props, resize, unmount, removed } = mount(
    t,
    {
      autosize: true,
    },
    { boxSizing: 'content-box', observer: false },
  );
  assert.equal(textarea.style.height, '84px');
  textarea.scrollHeight = 12;
  resize();
  assert.equal(textarea.style.height, '20px');
  props.autosize = { minRows: 3, maxRows: 5 };
  await Vue.nextTick();
  assert.equal(textarea.style.height, '60px');
  unmount();
  assert.equal(removed(), true);
});

test('非 autosize 时保留手动高度，输入、尺寸和宽度变化都不重置', async (t) => {
  const { textarea, props, resize } = mount(t, { modelValue: 'a' });
  textarea.style.height = '120px';
  textarea.style.overflowY = 'auto';

  props.modelValue = 'ab';
  await Vue.nextTick();
  assert.equal(textarea.style.height, '120px');
  assert.equal(textarea.style.overflowY, 'auto');

  resize(300);
  assert.equal(textarea.style.height, '120px');

  props.size = 'lg';
  await Vue.nextTick();
  assert.equal(textarea.style.height, '120px');

  props.autosize = true;
  await Vue.nextTick();
  assert.equal(textarea.style.height, '98px');
});
