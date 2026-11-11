import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope, nextTick, ref } from 'vue';
import { useMarkdownDraft } from '../../src/ui/markdown/draft.ts';

const STORAGE_KEY = 'web-kit:markdown-drafts:v1';

function browser(t, records, blocked = false) {
  const values = new Map(
    records === undefined ? [] : [[STORAGE_KEY, JSON.stringify(records)]],
  );
  const calls = { reads: 0, writes: 0, listeners: 0 };
  const storage = {
    getItem(key) {
      calls.reads++;
      if (blocked) throw Error('disabled');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      calls.writes++;
      if (blocked) throw Error('disabled');
      values.set(key, value);
    },
    removeItem(key) {
      if (blocked) throw Error('disabled');
      values.delete(key);
    },
  };
  const events = new EventTarget();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage: storage,
      addEventListener(...args) {
        calls.listeners++;
        events.addEventListener(...args);
      },
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  });
  return {
    calls,
    values,
    records: () => JSON.parse(values.get(STORAGE_KEY) ?? '{}'),
    external(records) {
      values.set(STORAGE_KEY, JSON.stringify(records));
      const event = new Event('storage');
      Object.defineProperties(event, {
        storageArea: { value: storage },
        key: { value: STORAGE_KEY },
      });
      events.dispatchEvent(event);
    },
  };
}

function editor(t, key = 'user:scene', initial) {
  const scope = effectScope();
  const context = ref(key);
  const start = ref(initial);
  const age = ref(undefined);
  const draft = scope.run(() =>
    useMarkdownDraft({ key: context, initialValue: start, maxAge: age }),
  );
  t.after(() => scope.stop());
  return { ...draft, context, start, age, scope };
}

function saveDraft(t, key, text, options = {}) {
  const now = Date.now;
  if (options.updatedAt !== undefined) Date.now = () => options.updatedAt;
  try {
    const e = editor(t, key);
    e.age.value = options.maxAge;
    e.text.value = text;
    e.scope.stop();
  } finally {
    Date.now = now;
  }
}

async function input(e, value) {
  e.text.value = value;
  await nextTick();
}

async function scene(e, key) {
  e.context.value = key;
  await nextTick();
}

test('无 key 不读写存储；初始值不保存，切换和重开恢复对应草稿', async (t) => {
  const storage = browser(t);
  const plain = editor(t, '', '已有正文');
  assert.equal(plain.text.value, '已有正文');
  await input(plain, '普通输入');
  assert.equal(storage.calls.reads, 0);
  assert.equal(storage.calls.writes, 0);
  plain.scope.stop();
  const e = editor(t, 'u:a', '@用户 ');
  assert.equal(e.text.value, '@用户 ');
  assert.deepEqual(storage.records(), {});
  await input(e, 'A');
  await scene(e, 'u:b');
  assert.equal(e.text.value, '@用户 ');
  assert.equal(storage.records()['u:b'], undefined);
  e.start.value = undefined;
  await scene(e, 'u:c');
  assert.equal(e.text.value, '');
  const writes = storage.calls.writes;
  await scene(e, 'u:a');
  assert.equal(e.text.value, 'A');
  assert.equal(e.restored.value, true);
  assert.equal(storage.calls.writes, writes);
  e.scope.stop();
  const reopened = editor(t, 'u:a');
  await input(reopened, '重开后编辑');
  assert.equal(storage.records()['u:a'].text, '重开后编辑');
  assert.equal(storage.calls.listeners, 1);
});

test('初值只在未编辑时跟随；键切换即时恢复，不保存初值或串稿', (t) => {
  const storage = browser(t);
  const e = editor(t, 'u:a', '@A ');
  e.start.value = '@A-new ';
  assert.equal(e.text.value, '@A-new ');
  assert.deepEqual(storage.records(), {});
  e.text.value = 'A 正文';
  e.start.value = '@ignored ';
  assert.equal(e.text.value, 'A 正文');
  e.context.value = 'u:b';
  e.start.value = '@B ';
  assert.equal(e.text.value, '@B ');
  assert.equal(storage.records()['u:b'], undefined);
  e.text.value = 'B 正文';
  e.context.value = 'u:a';
  assert.equal(e.text.value, 'A 正文');
  assert.equal(e.restored.value, true);
  e.clear();
  e.start.value = '@not-restored ';
  assert.equal(e.text.value, '');
  assert.equal(storage.records()['u:a'], undefined);
  assert.equal(storage.records()['u:b'].text, 'B 正文');
});

test('支持普通值与 getter 选项；空键禁用存储', (t) => {
  const storage = browser(t);
  const context = ref('getter:a');
  const scope = effectScope();
  t.after(() => scope.stop());
  const e = scope.run(() =>
    useMarkdownDraft({
      key: () => context.value,
      initialValue: '初始',
      maxAge: 1000,
    }),
  );
  e.text.value = '正文';
  const record = storage.records()['getter:a'];
  assert.equal(record.expiresAt - record.updatedAt, 1000);
  context.value = '  ';
  e.text.value = '不保存';
  assert.deepEqual(Object.keys(storage.records()), ['getter:a']);
});

test('提交失败保留；成功只清快照，新输入和新场景不受影响，回调幂等', async (t) => {
  const storage = browser(t);
  const e = editor(t);
  e.text.value = '待提交';
  const failed = e.prepareSubmission();
  assert.equal(storage.records()['user:scene'].text, '待提交');
  await input(e, '新正文');
  assert.equal(failed(), false);
  assert.equal(storage.records()['user:scene'].text, '新正文');
  const oldScene = e.prepareSubmission();
  await scene(e, 'other');
  await input(e, '另一场景');
  assert.equal(oldScene(), false);
  assert.equal(storage.records()['user:scene'], undefined);
  assert.equal(e.text.value, '另一场景');
  const finish = e.prepareSubmission();
  assert.equal(finish(), true);
  assert.equal(e.text.value, '');
  assert.equal(finish(), false);
  assert.deepEqual(storage.records(), {});
});

test('重新打开同一草稿不引入所有权；旧成功可清已提交记录但不改其他编辑器正文', (t) => {
  const storage = browser(t);
  const a = editor(t);
  a.text.value = '已提交';
  const finish = a.prepareSubmission();
  a.scope.stop();
  const b = editor(t);
  assert.equal(finish(), false);
  assert.deepEqual(storage.records(), {});
  assert.equal(b.text.value, '已提交');
  b.text.value = '新稿';
  assert.equal(b.prepareSubmission()(), true);
  assert.equal(b.text.value, '');
});

test('storage 事件同步整表，但不覆盖编辑框；快照不删外部新正文', (t) => {
  const storage = browser(t);
  const e = editor(t);
  e.text.value = '本页输入';
  const finish = e.prepareSubmission();
  const external = storage.records();
  external['user:scene'] = { text: '外部新稿', updatedAt: Date.now() + 1 };
  const writes = storage.calls.writes;
  storage.external(external);
  assert.equal(storage.calls.writes, writes);
  assert.equal(e.text.value, '本页输入');
  assert.equal(finish(), false);
  assert.equal(editor(t).text.value, '外部新稿');
});

test('手动丢弃只清当前草稿和正文，不碰其他业务', async (t) => {
  const storage = browser(t);
  storage.values.set('other-app', 'not json');
  const e = editor(t, 'u:a');
  await input(e, 'A');
  saveDraft(t, 'other:b', 'B');
  const finish = e.prepareSubmission();
  e.clear();
  assert.equal(finish(), false);
  assert.deepEqual(Object.keys(storage.records()), ['other:b']);
  assert.equal(e.text.value, '');
  assert.equal(e.restored.value, false);
  assert.equal(storage.values.get('other-app'), 'not json');
});

test('读写异常保留内存草稿；写入失败后仍可丢弃旧磁盘稿', async (t) => {
  const storage = browser(t, undefined, true);
  saveDraft(t, 'u:a', '内存草稿');
  assert.equal(editor(t, 'u:a').text.value, '内存草稿');
  assert.equal(storage.values.size, 0);
  const fallback = browser(t);
  saveDraft(t, 'u:a', '旧稿');
  const e = editor(t, 'u:a');
  window.localStorage.setItem = () => {
    throw Error('quota');
  };
  await input(e, '未落盘的新稿');
  assert.equal(editor(t, 'u:a').text.value, '未落盘的新稿');
  assert.equal(fallback.records()['u:a'].text, '旧稿');
  e.clear();
  assert.equal(e.text.value, '');
  assert.deepEqual(fallback.records(), {});
});

test('单个存储项最多保留 20 份，支持 TTL、空白删除和特殊 key', async (t) => {
  let storage = browser(t);
  const now = Date.now();
  for (let i = 0; i < 21; i++)
    saveDraft(t, String(i), String(i), { updatedAt: now + i });
  assert.equal(storage.values.size, 1);
  assert.equal(Object.keys(storage.records()).length, 20);
  assert.equal(storage.records()['0'], undefined);
  storage = browser(t);
  for (let i = 0; i < 21; i++)
    saveDraft(t, `same-ms:${i}`, String(i), { updatedAt: now });
  assert.equal(Object.keys(storage.records()).length, 20);
  assert.equal(storage.records()['same-ms:20'].text, '20');
  storage = browser(t);
  saveDraft(t, 'ttl', 'expired', { updatedAt: now - 100, maxAge: 10 });
  assert.equal(editor(t, 'ttl').text.value, '');
  saveDraft(t, 'constructor', 'safe');
  saveDraft(t, '__proto__', 'safe');
  assert.equal(storage.records().__proto__.text, 'safe');
  assert.equal(storage.records().constructor.text, 'safe');
  saveDraft(t, '__proto__', ' \n ');
  assert.equal(Object.hasOwn(storage.records(), '__proto__'), false);
  const e = editor(t, 'ttl-input');
  e.age.value = 1000;
  await input(e, 'ttl');
  const item = storage.records()['ttl-input'];
  assert.equal(item.expiresAt - item.updatedAt, 1000);
});

test('坏项和坏 JSON 可恢复，SSR 不跨调用共享内容', (t) => {
  const storage = browser(t, {
    good: { text: 'good', updatedAt: 1 },
    bad: { text: 1 },
    expired: { text: 'old', updatedAt: 1, expiresAt: 1 },
  });
  assert.equal(editor(t, 'good').text.value, 'good');
  assert.equal(editor(t, 'bad').text.value, '');
  const previous = window;
  browser(t).values.set(STORAGE_KEY, '{bad');
  assert.equal(editor(t).text.value, '');
  globalThis.window = {
    get localStorage() {
      throw Error('denied');
    },
  };
  saveDraft(t, 'memory', 'in-memory');
  assert.equal(editor(t, 'memory').text.value, 'in-memory');
  delete globalThis.window;
  saveDraft(t, 'ssr', 'must not leak');
  assert.equal(editor(t, 'ssr').text.value, '');
  globalThis.window = previous;
  assert.equal(storage.calls.listeners, 1);
});
