import assert from 'node:assert/strict';
import test from 'node:test';
import { dom } from '../helpers/dom.mjs';

const Vue = await import('vue');
const draft = await import('../../src/ui/markdown/draft.ts');
const { createComponentServer, installTestRouter } =
  await import('../helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const { default: UApp } = await server.ssrLoadModule(
  '@nuxt/ui/components/App.vue',
);
const { default: Editor } = await server.ssrLoadModule(
  '/src/ui/markdown/XMarkdownEditor.vue',
);

async function settle() {
  await Vue.nextTick();
  await Vue.nextTick();
  await Vue.nextTick();
}
function mount(t, initial = {}, slots = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const props = Vue.reactive({ ...initial });
  const events = [];
  const editor = Vue.ref();
  const app = Vue.createApp({
    render: () =>
      Vue.h(UApp, { toaster: null }, () =>
        Vue.h(
          Editor,
          {
            ...props,
            ref: editor,
            'onUpdate:modelValue': (value) => {
              props.modelValue = value;
              events.push(value);
            },
          },
          slots,
        ),
      ),
  });
  installTestRouter(app);
  app.mount(host);
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    host.remove();
  };
  t.after(unmount);
  return {
    host,
    root: host.firstElementChild,
    props,
    events,
    editor: editor.value,
    textarea: host.querySelector('textarea'),
    unmount,
    tool: (label) => host.querySelector(`button[aria-label="${label}"]`),
    tab: (text) =>
      [...host.querySelectorAll('[role="tab"]')].find(
        (node) => node.textContent.trim() === text,
      ),
  };
}
function event(node, type, options = {}) {
  const value = new dom.window.Event(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  node.dispatchEvent(value);
  return value;
}
async function input(view, text) {
  view.textarea.value = text;
  event(view.textarea, 'input');
  await settle();
}
async function preview(view) {
  const tab = view.tab('预览');
  tab.dispatchEvent(
    new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }),
  );
  tab.click();
  await settle();
}

test('父组件独立管理草稿，恢复、输入、切换场景和清空保持编辑器模型同步', async (t) => {
  dom.window.localStorage.clear();
  // The draft adapter uses the browser localStorage, not Nuxt's state.
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(dom.window, 'localStorage');
  Object.defineProperty(dom.window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  t.after(() => Object.defineProperty(dom.window, 'localStorage', original));
  const scene = Vue.ref('one');
  let state;
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    setup() {
      state = draft.useMarkdownDraft({
        key: () => `comment:${scene.value}`,
        initialValue: () => `@${scene.value} `,
      });
      return () =>
        Vue.h(UApp, { toaster: null }, () =>
          Vue.h(Editor, {
            modelValue: state.text.value,
            'onUpdate:modelValue': (value) => (state.text.value = value),
          }),
        );
    },
  });
  installTestRouter(app);
  app.mount(host);
  t.after(() => {
    app.unmount();
    host.remove();
  });
  const view = { textarea: host.querySelector('textarea') };
  assert.equal(view.textarea.value, '@one ');
  await input(view, '场景一正文');
  scene.value = 'two';
  await settle();
  assert.equal(view.textarea.value, '@two ');
  await input(view, '场景二正文');
  scene.value = 'one';
  await settle();
  assert.equal(view.textarea.value, '场景一正文');
  assert.equal(state.restored.value, true);
  state.clear();
  await settle();
  assert.equal(view.textarea.value, '');
  const records = JSON.parse(values.get('web-kit:markdown-drafts:v1'));
  assert.equal(records['comment:one'], undefined);
  assert.equal(records['comment:two'].text, '场景二正文');
});

test('原生属性和监听器只交给 textarea，invalid 和部位样式响应更新', async (t) => {
  let focused = 0;
  const view = mount(t, {
    id: 'body',
    name: 'body',
    rows: 4,
    maxlength: 80,
    'aria-label': '正文',
    'aria-invalid': 'grammar',
    class: 'w-64',
    style: { marginTop: '4px' },
    onFocus: () => focused++,
    ui: { root: 'rounded-lg', textarea: 'px-8', tool: 'text-red-500' },
  });
  assert.equal(view.textarea.id, 'body');
  assert.equal(view.textarea.name, 'body');
  assert.equal(view.textarea.rows, 4);
  assert.equal(view.textarea.maxLength, 80);
  assert.equal(view.textarea.getAttribute('aria-invalid'), 'grammar');
  assert.equal(view.root.id, '');
  assert.ok(view.root.classList.contains('w-64'));
  assert.ok(view.textarea.classList.contains('px-8'));
  assert.ok(view.tool('粗体').classList.contains('text-red-500'));
  view.textarea.focus();
  assert.equal(focused, 1);
  view.props.invalid = true;
  await settle();
  assert.equal(view.textarea.getAttribute('aria-invalid'), 'true');
  assert.ok(view.root.classList.contains('border-error'));
});

test('真实 UTabs 预览保留 textarea、更新源码；focus 和关闭 preview 恢复编辑', async (t) => {
  let actions;
  const view = mount(
    t,
    { modelValue: '# 原文', tools: [] },
    {
      toolbar: (value) => {
        actions = value;
        return Vue.h('b', '自定义工具');
      },
    },
  );
  assert.equal(actions.wrapSelection, view.editor.wrapSelection);
  await preview(view);
  assert.equal(view.host.querySelector('textarea'), view.textarea);
  assert.match(view.host.textContent, /原文/);
  assert.equal(
    view.textarea.closest('[role="tabpanel"]').getAttribute('data-state'),
    'inactive',
  );
  const tools = view.host.querySelector('[role="group"]');
  assert.equal(tools.getAttribute('aria-hidden'), 'true');
  view.props.modelValue = '# 更新';
  await settle();
  assert.match(view.host.textContent, /更新/);
  await view.editor.focus();
  await settle();
  assert.equal(document.activeElement, view.textarea);
  assert.equal(
    view.textarea.closest('[role="tabpanel"]').getAttribute('data-state'),
    'active',
  );
  view.editor.blur();
  assert.notEqual(document.activeElement, view.textarea);
  await preview(view);
  view.props.preview = false;
  await settle();
  assert.equal(view.tab('预览'), undefined);
  assert.equal(view.textarea.hidden, false);
});

test('autosize 切回编辑后等待面板可见再测量，预览期间保留高度', async (t) => {
  const view = mount(t, { modelValue: '正文' });
  const measurements = [];
  let contentHeight = 360;
  Object.defineProperty(view.textarea, 'scrollHeight', {
    configurable: true,
    get() {
      const hidden = !!view.textarea.closest('[hidden]');
      measurements.push(hidden);
      return hidden ? 0 : contentHeight;
    },
  });
  await input(view, '较长正文');
  assert.equal(view.textarea.style.height, '360px');

  await preview(view);
  contentHeight = 480;
  view.props.modelValue = '预览期间更新正文';
  await settle();
  assert.equal(view.textarea.style.height, '360px');

  const tab = view.tab('编辑');
  tab.dispatchEvent(
    new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }),
  );
  tab.click();
  // 同一轮更新触发普通 resize，仍隐藏时不应写回零高度。
  view.props.rows = 8;
  await settle();
  assert.equal(view.textarea.style.height, '360px');
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  assert.equal(view.textarea.closest('[role="tabpanel"]').hidden, false);
  assert.equal(view.textarea.style.height, '480px');
  assert.deepEqual(measurements, [false, false]);
});

test('空预览提示与空 tools 不产生工具栏', async (t) => {
  const view = mount(t, { modelValue: '  \n', tools: [] });
  assert.equal(view.host.querySelector('[role="group"]'), null);
  await preview(view);
  assert.match(view.host.textContent, /没有可预览的内容/);
});

test('工具保留选区、键盘 click 激活；公开块插入保持占位选区与换行', async (t) => {
  const view = mount(t, { modelValue: '前文字后', tools: ['bold', 'link'] });
  view.textarea.setSelectionRange(1, 3);
  assert.equal(event(view.tool('粗体'), 'mousedown').defaultPrevented, true);
  view.tool('粗体').click();
  await settle();
  assert.equal(view.props.modelValue, '前**文字**后');
  assert.deepEqual(
    [view.textarea.selectionStart, view.textarea.selectionEnd],
    [3, 5],
  );
  view.props.modelValue = '前后';
  await settle();
  view.textarea.setSelectionRange(1, 1);
  assert.equal(await view.editor.insertBlock('```\n', '\n```', '代码'), true);
  assert.equal(view.props.modelValue, '前\n```\n代码\n```\n后');
  assert.deepEqual(
    [view.textarea.selectionStart, view.textarea.selectionEnd],
    [6, 8],
  );
});

test('扩展工具显式启用后遵循顺序和插入语法', async (t) => {
  const view = mount(t, { tools: ['details', 'spoiler', 'star'] });
  assert.deepEqual(
    [...view.host.querySelectorAll('[role="group"] button')].map((node) =>
      node.getAttribute('aria-label'),
    ),
    ['折叠内容', '剧透', '评分'],
  );
  for (const [label, expected] of [
    ['剧透', '前!!文字!!后'],
    ['评分', '前\n::: star 5\n后'],
    ['折叠内容', '前\n::: details 点击展开\n折叠内容\n:::\n后'],
  ]) {
    view.props.modelValue = label === '剧透' ? '前文字后' : '前后';
    await settle();
    view.textarea.setSelectionRange(1, label === '剧透' ? 3 : 1);
    view.tool(label).click();
    await settle();
    assert.equal(view.props.modelValue, expected);
  }
});

test('disabled/readonly/组合输入拒绝工具和公开操作；maxlength 拒绝超长插入', async (t) => {
  const view = mount(t, { modelValue: '文字', maxlength: 5 });
  for (const state of ['disabled', 'readonly', 'composing']) {
    if (state === 'composing') event(view.textarea, 'compositionstart');
    else view.props[state] = true;
    await settle();
    assert.equal(view.tool('粗体').disabled, true);
    assert.equal(await view.editor.wrapSelection('*', '*'), false);
    assert.equal(await view.editor.insertBlock('# '), false);
    if (state === 'composing') event(view.textarea, 'compositionend');
    else view.props[state] = false;
    await settle();
  }
  view.textarea.setSelectionRange(0, 2);
  assert.equal(await view.editor.wrapSelection('**', '**'), false);
  assert.equal(await view.editor.wrapSelection('*', '*'), true);
  assert.equal(view.props.modelValue, '*文字*');
});

test('textarea 模型保留字符串，IME 延迟提交，粘贴链接转换保留选区', async (t) => {
  const view = mount(t, { modelValue: '初始' });
  await input(view, '001');
  assert.deepEqual(view.events, ['001']);
  event(view.textarea, 'compositionstart');
  await input(view, 'zhong');
  assert.deepEqual(view.events, ['001']);
  view.textarea.value = '中文';
  event(view.textarea, 'compositionend');
  await settle();
  assert.deepEqual(view.events, ['001', '中文']);
  document.execCommand = (_, __, text) => {
    view.textarea.setRangeText(
      text,
      view.textarea.selectionStart,
      view.textarea.selectionEnd,
    );
    event(view.textarea, 'input');
    return true;
  };
  t.after(() => delete document.execCommand);
  view.textarea.focus();
  view.textarea.setSelectionRange(0, 2);
  const paste = new dom.window.Event('paste', {
    bubbles: true,
    cancelable: true,
  });
  paste.clipboardData = { getData: () => 'https://example.com' };
  view.textarea.dispatchEvent(paste);
  await settle();
  assert.equal(paste.defaultPrevented, true);
  assert.equal(view.props.modelValue, '[中文](https://example.com/)');
});

test('sticky 越过偏移标记 stuck，关闭时断开观察；autosize 更新并在卸载断开', async (t) => {
  const previousIntersection = globalThis.IntersectionObserver;
  const previousResize = globalThis.ResizeObserver;
  let stuckObserver;
  let widthObserver;
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      stuckObserver = this;
    }
    observe(node) {
      this.node = node;
    }
    disconnect() {
      this.disconnected = true;
    }
  };
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      widthObserver = this;
    }
    observe(node) {
      this.node = node;
    }
    unobserve() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  t.after(() => {
    globalThis.IntersectionObserver = previousIntersection;
    globalThis.ResizeObserver = previousResize;
  });
  const view = mount(t, { sticky: true, stickyOffset: 50 });
  assert.equal(stuckObserver.options.rootMargin, '-50px 0px 0px 0px');
  stuckObserver.callback([
    {
      isIntersecting: false,
      boundingClientRect: { top: 10 },
      rootBounds: { top: 50 },
    },
  ]);
  await settle();
  assert.ok(view.host.querySelector('[data-stuck]'));
  view.props.sticky = false;
  await settle();
  assert.equal(stuckObserver.disconnected, true);
  assert.equal(view.host.querySelector('[data-stuck]'), null);
  // Reka also creates observers; identify the editor observer by the root it observes.
  const editorObserver = widthObserver;
  Object.defineProperty(view.textarea, 'scrollHeight', {
    configurable: true,
    value: 144,
  });
  view.props.modelValue = '更多内容';
  await settle();
  assert.equal(view.textarea.style.height, '144px');
  view.props.autosize = false;
  await settle();
  assert.equal(view.textarea.style.height, '');
  view.unmount();
  assert.equal(editorObserver.disconnected, true);
});
