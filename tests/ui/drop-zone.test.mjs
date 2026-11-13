import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope, nextTick, ref } from 'vue';
import { readDroppedEntry } from '../../src/ui/drop-zone/readDroppedEntry.ts';

// VueUse 在导入时判断浏览器环境；用原生 EventTarget 测试真实监听逻辑。
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const previousDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: new EventTarget(),
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: new EventTarget(),
});
const { useFileDrop } = await import('../../src/ui/drop-zone/useFileDrop.ts');
test.after(() => {
  if (previousWindow)
    Object.defineProperty(globalThis, 'window', previousWindow);
  else delete globalThis.window;
  if (previousDocument)
    Object.defineProperty(globalThis, 'document', previousDocument);
  else delete globalThis.document;
});

async function setup(t, { directories = false } = {}) {
  const target = new EventTarget();
  const disabled = ref(false);
  const received = [];
  const errors = [];
  const scope = effectScope();
  const { active } = scope.run(() =>
    useFileDrop(disabled, (...args) => received.push(args), target, {
      directories,
      onError: (...args) => errors.push(args),
    }),
  );
  t.after(() => scope.stop());
  await nextTick();

  function dispatch(
    type,
    { types = ['Files'], files = [], items, ...extra } = {},
  ) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, {
      dataTransfer: {
        types,
        files,
        items:
          items ??
          (types.includes('Files')
            ? [{ kind: 'file', type: '' }]
            : [{ kind: 'string', type: types[0] ?? '' }]),
        dropEffect: 'none',
      },
      ...extra,
    });
    target.dispatchEvent(event);
    return event;
  }
  return { active, disabled, received, errors, dispatch, scope };
}

test('系统文件拖入显示遮罩，嵌套元素切换不闪烁，离开窗口关闭', async (t) => {
  const { active, dispatch } = await setup(t);
  assert.equal(active.value, false);
  assert.equal(dispatch('dragenter').defaultPrevented, true);
  assert.equal(active.value, true);
  dispatch('dragenter');
  dispatch('dragleave');
  assert.equal(active.value, true);
  dispatch('dragleave');
  assert.equal(active.value, false);
  dispatch('dragleave');
  await nextTick();
  dispatch('dragenter');
  assert.equal(active.value, true);
  const over = dispatch('dragover');
  assert.equal(over.defaultPrevented, true);
  assert.equal(over.dataTransfer.dropEffect, 'copy');
});

test('放下文件只交出原始文件和事件，关闭遮罩，空列表不触发', async (t) => {
  const { active, received, dispatch } = await setup(t);
  const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
  dispatch('dragenter');
  const event = dispatch('drop', { files });
  assert.equal(event.defaultPrevented, true);
  assert.equal(active.value, false);
  assert.equal(received.length, 1);
  assert.deepEqual(received[0][0], files);
  assert.equal(received[0][0][0], files[0]);
  assert.equal(received[0][1], event);
  dispatch('drop');
  assert.equal(received.length, 1);
});

test('不拦截文本、链接或页面内发起的文件拖拽', async (t) => {
  const { active, received, dispatch } = await setup(t);
  for (const types of [[], ['text/plain'], ['text/uri-list']]) {
    for (const type of ['dragenter', 'dragover', 'drop']) {
      assert.equal(dispatch(type, { types }).defaultPrevented, false);
      assert.equal(active.value, false);
    }
  }
  dispatch('dragstart');
  assert.equal(dispatch('dragenter').defaultPrevented, false);
  assert.equal(dispatch('dragover').defaultPrevented, false);
  dispatch('drop', { files: [new File([], 'internal.txt')] });
  assert.equal(received.length, 0);
  dispatch('dragend');
  await nextTick();
  dispatch('dragenter');
  assert.equal(active.value, true);
});

test('Safari 跳过有效性检查时，文本仍不显示遮罩或交出文件', async (t) => {
  const previous = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Version/18.0 Safari/605.1.15',
  });
  t.after(() => {
    if (previous) Object.defineProperty(navigator, 'userAgent', previous);
    else delete navigator.userAgent;
  });
  const { active, received, dispatch } = await setup(t);
  dispatch('dragenter', { types: ['text/plain'] });
  assert.equal(active.value, false);
  dispatch('drop', { types: ['text/plain'] });
  assert.equal(received.length, 0);
});

test('禁用立即关闭，不拦截事件；启用后正常接收', async (t) => {
  const { active, disabled, received, dispatch } = await setup(t);
  dispatch('dragenter');
  disabled.value = true;
  assert.equal(active.value, false);
  for (const type of ['dragenter', 'dragover', 'drop']) {
    assert.equal(dispatch(type).defaultPrevented, false);
  }
  assert.equal(received.length, 0);
  disabled.value = false;
  await nextTick();
  dispatch('dragenter');
  assert.equal(active.value, true);
});

test('Escape、失焦、拖拽结束关闭，卸载清理所有监听', async (t) => {
  const { active, received, dispatch, scope } = await setup(t);
  for (const [type, extra] of [
    ['keydown', { key: 'Escape' }],
    ['blur', {}],
    ['dragend', {}],
  ]) {
    dispatch('dragenter');
    assert.equal(active.value, true);
    dispatch(type, extra);
    assert.equal(active.value, false);
    await nextTick();
  }
  scope.stop();
  assert.equal(dispatch('dragenter').defaultPrevented, false);
  assert.equal(active.value, false);
  assert.equal(
    dispatch('drop', { files: [new File([], 'file.txt')] }).defaultPrevented,
    false,
  );
  assert.equal(received.length, 0);
});

const settle = () => new Promise((resolve) => setImmediate(resolve));
const fileEntry = (file) => ({
  isFile: true,
  file: (resolve) => resolve(file),
});
const directoryItem = (readEntries) => ({
  kind: 'file',
  webkitGetAsEntry: () => ({
    isDirectory: true,
    createReader: () => ({ readEntries }),
  }),
  getAsFile: () => null,
});
function pendingDirectory() {
  let resolve, reject;
  let calls = 0;
  const item = directoryItem((ok, fail) => {
    if (calls++) ok([]);
    else {
      resolve = ok;
      reject = fail;
    }
  });
  return {
    item,
    resolve: (entries) => resolve(entries),
    reject: (error) => reject(error),
  };
}

test('目录默认不展开；开启后目录-only、混拖、空目录各只触发一次', async (t) => {
  const normal = await setup(t);
  const enabled = await setup(t, { directories: true });
  const nested = new File(['nested'], 'nested.txt');
  const loose = new File(['loose'], 'loose.txt');
  const pending = pendingDirectory();
  normal.dispatch('drop', { items: [pending.item] });
  assert.equal(normal.received.length, 0);
  const event = enabled.dispatch('drop', { items: [pending.item] });
  assert.equal(event.defaultPrevented, true);
  pending.resolve([fileEntry(nested)]);
  await settle();
  assert.deepEqual(enabled.received, [[[nested], event]]);

  const mixed = pendingDirectory();
  const mixedEvent = enabled.dispatch('drop', {
    files: [loose],
    items: [mixed.item, { kind: 'file', getAsFile: () => loose }],
  });
  // 条目已同步保留，异步期间清空 DataTransfer 不影响结果。
  mixedEvent.dataTransfer.items.length = 0;
  mixed.resolve([fileEntry(nested)]);
  await settle();
  assert.deepEqual(enabled.received[1], [[nested, loose], mixedEvent]);
  assert.equal(enabled.received.length, 2);

  const emptyEvent = enabled.dispatch('drop', {
    items: [directoryItem((ok) => ok([]))],
  });
  await settle();
  assert.deepEqual(enabled.received[2], [[], emptyEvent]);
});

test('大子目录分批读取并保留顺序，不将全部后代展开为函数参数', async () => {
  const first = new File([], 'first.txt');
  const nested = new File([], 'nested.txt');
  const last = new File([], 'last.txt');
  const count = 150_000;
  const directoryEntry = (entries) => ({
    isDirectory: true,
    createReader() {
      let offset = 0;
      return {
        readEntries(resolve) {
          const batch = entries.slice(offset, offset + 100);
          offset += batch.length;
          resolve(batch);
        },
      };
    },
  });
  const root = directoryEntry([
    fileEntry(first),
    directoryEntry(Array(count).fill(fileEntry(nested))),
    fileEntry(last),
  ]);
  const files = await readDroppedEntry(root);
  assert.equal(files.length, count + 2);
  assert.equal(files[0], first);
  assert.ok(files.slice(1, -1).every((file) => file === nested));
  assert.equal(files.at(-1), last);
});

test('目录读取与同步取 entry 失败发出 error，不交出部分文件', async (t) => {
  const { dispatch, received, errors } = await setup(t, { directories: true });
  const failure = new Error('directory failed');
  const pending = pendingDirectory();
  const event = dispatch('drop', { items: [pending.item] });
  pending.reject(failure);
  await settle();
  assert.deepEqual(errors, [[failure, event]]);
  const broken = dispatch('drop', {
    items: [
      {
        kind: 'file',
        webkitGetAsEntry() {
          throw failure;
        },
      },
    ],
  });
  assert.deepEqual(errors[1], [failure, broken]);
  assert.equal(received.length, 0);
});

test('重置、禁用、内部拖动、卸载及新 drop 忽略过期结果', async (t) => {
  // 每个失效入口取一个结果分支，不穷举入口与成功/失败的笛卡尔积。
  for (const [action, fail] of [
    ['disabled', false],
    ['dragstart', true],
    ['unmount', true],
    ['drop', false],
    ['Escape', false],
    ['blur', true],
  ]) {
    const { disabled, dispatch, received, errors, scope } = await setup(t, {
      directories: true,
    });
    const pending = pendingDirectory();
    dispatch('drop', { items: [pending.item] });
    if (action === 'disabled') {
      disabled.value = true;
      disabled.value = false;
    } else if (action === 'unmount') scope.stop();
    else if (action === 'Escape') dispatch('keydown', { key: 'Escape' });
    else dispatch(action);
    if (fail) pending.reject(new Error('stale'));
    else pending.resolve([fileEntry(new File([], 'stale.txt'))]);
    await settle();
    assert.deepEqual(received, [], action);
    assert.deepEqual(errors, [], action);
  }
});

test('无浏览器文档时可安全创建（SSR）', () => {
  const document = globalThis.document;
  delete globalThis.document;
  const scope = effectScope();
  try {
    const { active } = scope.run(() => useFileDrop(false, () => {}, undefined));
    assert.equal(active.value, false);
  } finally {
    scope.stop();
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: document,
    });
  }
});
