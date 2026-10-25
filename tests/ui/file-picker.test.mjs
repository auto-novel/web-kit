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
const classes = await import('../../src/ui/classes.ts');
const XButton = compileComponent(
  new URL('../../src/ui/button/XButton.vue', import.meta.url),
  {
    vue: Vue,
    '../classes': classes,
    './variants': await import('../../src/ui/button/variants.ts'),
  },
);
const XFilePicker = compileComponent(
  new URL('../../src/ui/file-picker/XFilePicker.vue', import.meta.url),
  {
    vue: Vue,
    '../classes': classes,
    '../button/XButton.vue': XButton,
  },
);

function mount(t, initial = {}, slots = {}) {
  const props = Vue.reactive(initial);
  const picker = Vue.ref();
  const events = [];
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(
        XFilePicker,
        { ...props, ref: picker, onSelect: (files) => events.push(files) },
        slots,
      ),
  });
  app.mount(host);
  t.after(() => {
    app.unmount();
    host.remove();
  });
  const input = host.querySelector('input');
  let opens = 0;
  input.click = () => opens++;
  return { host, input, props, picker, events, opens: () => opens };
}

function select(input, files) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

test('默认按钮不提交表单，原生选项交给隐藏 input，外部属性留在容器', (t) => {
  const { host, input, opens } = mount(t, {
    accept: '.txt,image/*',
    multiple: true,
    id: 'picker',
    class: 'gap-2',
    style: { marginTop: '4px' },
    'aria-label': '文件选择',
  });
  const root = host.firstElementChild;
  assert.equal(root.id, 'picker');
  assert.ok(root.classList.contains('gap-2'));
  assert.equal(root.style.marginTop, '4px');
  assert.equal(root.getAttribute('aria-label'), '文件选择');
  assert.equal(input.id, '');
  assert.equal(input.type, 'file');
  assert.equal(input.hidden, true);
  assert.equal(input.accept, '.txt,image/*');
  assert.equal(input.multiple, true);
  const button = host.querySelector('button');
  assert.equal(button.type, 'button');
  assert.equal(button.textContent.trim(), '选择文件');
  button.click();
  assert.equal(opens(), 1);
});

test('返回原始 File 数组，清空原生值以支持重选；取消或空文件不触发', (t) => {
  const { input, picker, events, opens } = mount(t);
  assert.equal(input.multiple, false);
  // 浏览器禁止脚本写入非空文件路径，用属性模拟选择后的只读路径。
  let value = 'C:\\fakepath\\note.txt';
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => value,
    set: (next) => (value = next),
  });
  const file = new dom.window.File(['hello'], 'note.txt');
  select(input, [file]);
  assert.equal(value, '');
  assert.deepEqual(events, [[file]]);
  assert.equal(events[0][0], file);
  value = 'C:\\fakepath\\note.txt';
  picker.value.open();
  assert.equal(value, '');
  assert.equal(opens(), 1);
  select(input, [file]);
  assert.deepEqual(events, [[file], [file]]);
  select(input, []);
  select(input, null);
  input.dispatchEvent(new dom.window.Event('cancel'));
  assert.equal(events.length, 2);
});

test('自定义 trigger 接收 open/disabled，禁用时所有入口及选择事件都被阻止', async (t) => {
  let trigger;
  const { host, input, props, picker, events, opens } = mount(
    t,
    {},
    {
      trigger: (scope) => {
        trigger = scope;
        return Vue.h(
          'button',
          { type: 'button', disabled: scope.disabled, onClick: scope.open },
          '导入文件',
        );
      },
    },
  );
  assert.equal(host.querySelectorAll('button').length, 1);
  const button = host.querySelector('button');
  assert.equal(button.textContent, '导入文件');
  button.click();
  assert.equal(opens(), 1);
  props.disabled = true;
  await Vue.nextTick();
  assert.equal(trigger.disabled, true);
  assert.equal(button.disabled, true);
  assert.equal(input.disabled, true);
  button.click();
  trigger.open();
  picker.value.open();
  select(input, [new dom.window.File([''], 'ignored.txt')]);
  assert.equal(opens(), 1);
  assert.deepEqual(events, []);
  props.disabled = false;
  await Vue.nextTick();
  picker.value.open();
  assert.equal(opens(), 2);
});

test('默认按钮响应 disabled 更新', async (t) => {
  const { host, input, props, opens } = mount(t, { disabled: true });
  const button = host.querySelector('button');
  assert.equal(button.disabled, true);
  assert.equal(input.disabled, true);
  button.click();
  assert.equal(opens(), 0);
  props.disabled = false;
  await Vue.nextTick();
  button.click();
  assert.equal(opens(), 1);
});
