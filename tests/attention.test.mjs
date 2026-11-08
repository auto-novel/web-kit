import assert from 'node:assert/strict';
import './helpers/register-source.mjs';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';

import { computed, shallowRef } from 'vue';
const { createAttention } = await import('../src/attentionContext.ts');

const KEY = 'web-kit:attention:v1';
const HOUR = 3_600_000;
const attentionStatus = (hasUnread) => ({ strikes: { hasUnread } });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup(
  t,
  {
    cached,
    unavailable = false,
    writeUnavailable = false,
    hidden = false,
  } = {},
) {
  const originals = new Map(
    ['document', 'window'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const document = new EventTarget();
  document.visibilityState = hidden ? 'hidden' : 'visible';
  const values = new Map(cached === undefined ? [] : [[KEY, cached]]);
  const storage = {
    getItem(key) {
      if (unavailable) throw new Error('storage disabled');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (unavailable || writeUnavailable) throw new Error('storage disabled');
      values.set(key, value);
    },
    removeItem(key) {
      if (unavailable || writeUnavailable) throw new Error('storage disabled');
      values.delete(key);
    },
  };
  const window = new EventTarget();
  window.localStorage = storage;
  for (const [key, value] of Object.entries({ document, window })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  let now = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => now);
  const intervals = new Map();
  let nextTimer = 0;
  const setInterval = t.mock.method(
    globalThis,
    'setInterval',
    (callback, delay) => {
      assert.equal(delay, 900_000);
      const id = ++nextTimer;
      intervals.set(id, callback);
      return id;
    },
  );
  const clearInterval = t.mock.method(globalThis, 'clearInterval', (id) => {
    intervals.delete(id);
  });
  function tab(initialUser) {
    const reads = [];
    const writes = [];
    const user = shallowRef(
      initialUser === undefined ? undefined : { id: initialUser },
    );
    const context = createAttention({
      whoami: computed(() => ({ user: user.value })),
      getAttentionStatus() {
        const request = deferred();
        reads.push(request);
        return request.promise;
      },
      updateMyStrikeReadState(throughId) {
        const request = { ...deferred(), throughId };
        writes.push(request);
        return request.promise;
      },
    });
    return {
      context,
      reads,
      writes,
      login(id) {
        user.value = id === undefined ? undefined : { id };
      },
    };
  }
  return {
    ...tab(),
    tab,
    values,
    setInterval,
    clearInterval,
    intervals,
    advance(ms) {
      now += ms;
    },
    tick() {
      for (const callback of intervals.values()) callback();
    },
    visible(value) {
      document.visibilityState = value ? 'visible' : 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    },
    broadcast() {
      const event = new Event('storage');
      Object.assign(event, { key: KEY, storageArea: storage });
      window.dispatchEvent(event);
    },
  };
}

test('coalesces refreshes, shares a one-hour success cooldown, and retries failed GET on the next timer', async (t) => {
  const h = setup(t);
  await h.context.refresh();
  assert.equal(h.reads.length, 0);
  h.login(1);
  const first = h.context.refresh();
  assert.equal(first, h.context.refresh());
  h.visible(true);
  h.tick();
  await setImmediate();
  assert.equal(h.reads.length, 1);
  h.reads[0].resolve(attentionStatus(true));
  await first;
  h.advance(HOUR - 1);
  h.visible(true);
  h.tick();
  await h.context.refresh();
  assert.equal(h.reads.length, 1);
  h.advance(1);
  const record = h.values.get(KEY);
  const retry = h.context.refresh();
  await setImmediate();
  h.reads[1].reject(new Error('offline'));
  await retry;
  assert.equal(h.context.status.value.strikes.hasUnread, true);
  assert.equal(h.values.get(KEY), record);
  assert.equal(JSON.parse(h.values.get(KEY)).fetchedAt, Date.now() - HOUR);
  h.tick();
  await setImmediate();
  assert.equal(h.reads.length, 3);
  const recovered = h.context.refresh();
  h.reads[2].resolve(attentionStatus(false));
  await recovered;
  assert.equal(h.context.status.value.strikes.hasUnread, false);
});

test('queues acknowledgement behind a query and queries again after the write', async (t) => {
  const h = setup(t);
  h.login(1);
  await setImmediate();
  const update = h.context.updateStrikeReadState(10);
  assert.equal(h.writes.length, 0);
  h.reads[0].resolve(attentionStatus(true));
  await setImmediate();
  assert.equal(h.context.status.value, undefined);
  assert.equal(h.writes[0].throughId, 10);
  h.context.refresh();
  h.tick();
  assert.equal(h.reads.length, 1);
  h.writes[0].resolve({ hasUnread: false });
  await setImmediate();
  assert.equal(h.context.status.value.strikes.hasUnread, false);
  assert.equal(h.reads.length, 2);
  h.reads[1].resolve(attentionStatus(true));
  await update;
  assert.equal(h.context.status.value.strikes.hasUnread, true);
});

test('serializes writes and merges pending boundaries using their maximum', async (t) => {
  const h = setup(t);
  h.login(1);
  const result = h.context.updateStrikeReadState(10);
  await setImmediate();
  assert.equal(h.reads.length, 0);
  h.context.updateStrikeReadState(30);
  h.context.updateStrikeReadState(20);
  assert.equal(h.writes.length, 1);
  h.writes[0].resolve({ hasUnread: true });
  await setImmediate();
  assert.deepEqual(
    h.writes.map((write) => write.throughId),
    [10, 30],
  );
  h.writes[1].resolve({ hasUnread: false });
  await setImmediate();
  h.reads[0].resolve(attentionStatus(false));
  await result;
  assert.equal(h.context.status.value.strikes.hasUnread, false);
});

test('retries a failed pending acknowledgement on the next timer, bypassing the success cooldown', async (t) => {
  const h = setup(t);
  h.login(1);
  const initial = h.context.refresh();
  await setImmediate();
  h.reads[0].resolve(attentionStatus(true));
  await initial;
  const record = h.values.get(KEY);
  const update = h.context.updateStrikeReadState(12);
  await setImmediate();
  h.writes[0].reject(new Error('offline'));
  await update;
  assert.equal(h.context.status.value.strikes.hasUnread, true);
  assert.equal(h.values.get(KEY), record);
  assert.equal(JSON.parse(h.values.get(KEY)).fetchedAt, Date.now());
  h.tick();
  await setImmediate();
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[1].throughId, 12);
  assert.equal(h.reads.length, 1);
  const recovered = h.context.refresh();
  h.writes[1].resolve({ hasUnread: false });
  await setImmediate();
  h.reads[1].resolve(attentionStatus(false));
  await recovered;
  assert.equal(h.context.status.value.strikes.hasUnread, false);
});

test('account changes discard pending acknowledgements and old responses; logout clears storage', async (t) => {
  const h = setup(t);
  h.login(1);
  const old = h.context.updateStrikeReadState(10);
  await setImmediate();
  h.context.updateStrikeReadState(20);
  h.login(2);
  const next = h.context.refresh();
  await setImmediate();
  h.reads[0].resolve(attentionStatus(true));
  await next;
  h.writes[0].resolve({ hasUnread: false });
  await old;
  assert.equal(h.writes.length, 1);
  assert.equal(h.context.status.value.strikes.hasUnread, true);
  h.advance(HOUR);
  const stale = h.context.refresh();
  await setImmediate();
  h.login(undefined);
  assert.equal(h.context.status.value, undefined);
  assert.equal(h.values.has(KEY), false);
  h.login(2);
  const relogin = h.context.refresh();
  await setImmediate();
  h.reads[2].resolve(attentionStatus(false));
  await relogin;
  h.reads[1].resolve(attentionStatus(true));
  await stale;
  assert.equal(h.context.status.value.strikes.hasUnread, false);
  assert.equal(JSON.parse(h.values.get(KEY)).status.strikes.hasUnread, false);
});

test('hidden tabs defer automatic and explicit reads until visible; polling stops on logout', async (t) => {
  const h = setup(t, { hidden: true });
  h.login(1);
  h.tick();
  await h.context.refresh();
  assert.equal(h.reads.length, 0);
  h.visible(true);
  const initial = h.context.refresh();
  await setImmediate();
  h.reads[0].resolve(attentionStatus(true));
  await initial;
  assert.equal(h.setInterval.mock.callCount(), 1);
  h.advance(HOUR);
  h.visible(false);
  h.tick();
  await h.context.refresh();
  assert.equal(h.reads.length, 1);
  h.login(undefined);
  assert.equal(h.context.status.value, undefined);
  assert.equal(h.clearInterval.mock.callCount(), 1);
  assert.equal(h.intervals.size, 0);
  h.tick();
  h.visible(true);
  await setImmediate();
  assert.equal(h.reads.length, 1);
  h.login(2);
  assert.equal(h.setInterval.mock.callCount(), 2);
});

test('storage events share status and cooldown between tabs', async (t) => {
  const h = setup(t);
  h.login(1);
  const initial = h.context.refresh();
  await setImmediate();
  h.reads[0].resolve(attentionStatus(true));
  await initial;

  const other = h.tab(1);
  await other.context.refresh();
  assert.equal(other.reads.length, 0);
  assert.equal(other.context.status.value.strikes.hasUnread, true);

  const update = h.context.updateStrikeReadState(10);
  await setImmediate();
  h.writes[0].resolve({ hasUnread: false });
  await setImmediate();
  h.reads[1].resolve(attentionStatus(false));
  await update;
  h.broadcast();
  assert.equal(other.context.status.value.strikes.hasUnread, false);
  await other.context.refresh();
  assert.equal(other.reads.length, 0);
});

test('successful acknowledgement survives GET failure and the next timer retries only GET without cooldown', async (t) => {
  const h = setup(t);
  h.login(1);
  const initial = h.context.refresh();
  await setImmediate();
  h.reads[0].resolve(attentionStatus(true));
  await initial;
  const update = h.context.updateStrikeReadState(10);
  await setImmediate();
  h.writes[0].resolve({ hasUnread: false });
  await setImmediate();
  assert.equal(h.reads.length, 2);
  const record = h.values.get(KEY);
  assert.equal(JSON.parse(record).fetchedAt, 0);
  h.reads[1].reject(new Error('offline'));
  await update;
  assert.equal(h.context.status.value.strikes.hasUnread, false);
  assert.equal(h.values.get(KEY), record);
  h.tick();
  await setImmediate();
  assert.equal(h.writes.length, 1);
  assert.equal(h.reads.length, 3);
  const retry = h.context.refresh();
  h.reads[2].resolve(attentionStatus(false));
  await retry;
});

test('starts from a fresh matching cache and ignores another account cache', async (t) => {
  const h = setup(t);
  h.values.set(
    KEY,
    JSON.stringify({
      userId: 1,
      status: attentionStatus(true),
      fetchedAt: Date.now(),
    }),
  );
  const cached = h.tab(1);
  assert.equal(cached.context.status.value.strikes.hasUnread, true);
  await cached.context.refresh();
  assert.equal(cached.reads.length, 0);
  cached.login(2);
  assert.equal(cached.context.status.value, undefined);
  const refresh = cached.context.refresh();
  await setImmediate();
  cached.reads[0].resolve(attentionStatus(false));
  await refresh;
  assert.equal(cached.context.status.value.strikes.hasUnread, false);
});

test('invalid JSON and malformed cache records fall back to a network read', async (t) => {
  const h = setup(t);
  for (const raw of [
    '{broken',
    JSON.stringify({ userId: 1, fetchedAt: Date.now() }),
    JSON.stringify({
      userId: 1,
      status: attentionStatus('yes'),
      fetchedAt: Date.now(),
    }),
  ]) {
    h.values.set(KEY, raw);
    const tab = h.tab(1);
    assert.equal(tab.context.status.value, undefined);
    assert.equal(h.values.has(KEY), false);
    const refresh = tab.context.refresh();
    await setImmediate();
    tab.reads[0].resolve(attentionStatus(false));
    await refresh;
    assert.equal(tab.context.status.value.strikes.hasUnread, false);
  }
});

test('unavailable storage degrades to in-memory coalescing and cooldown', async (t) => {
  for (const options of [{ unavailable: true }, { writeUnavailable: true }]) {
    await t.test(Object.keys(options)[0], async (t) => {
      const h = setup(t, options);
      h.login(1);
      const initial = h.context.refresh();
      assert.equal(initial, h.context.refresh());
      await setImmediate();
      h.reads[0].resolve(attentionStatus(true));
      await initial;
      h.advance(HOUR - 1);
      await h.context.refresh();
      assert.equal(h.reads.length, 1);
      assert.equal(h.context.status.value.strikes.hasUnread, true);
      h.advance(1);
      const next = h.context.refresh();
      await setImmediate();
      h.reads[1].resolve(attentionStatus(false));
      await next;
      assert.equal(h.context.status.value.strikes.hasUnread, false);
    });
  }
});

test('initial GET failure creates no cache and retries immediately on timer, visibility, or menu refresh', async (t) => {
  const h = setup(t);
  h.login(1);
  const initial = h.context.refresh();
  await setImmediate();
  h.reads[0].reject(new Error('offline'));
  await initial;
  assert.equal(h.context.status.value, undefined);
  assert.equal(h.values.has(KEY), false);
  for (const trigger of [
    () => h.tick(),
    () => h.visible(true),
    () => h.context.refresh(),
  ]) {
    const before = h.reads.length;
    trigger();
    await setImmediate();
    assert.equal(h.reads.length, before + 1);
    const retry = h.context.refresh();
    h.reads[before].reject(new Error('still offline'));
    await retry;
    assert.equal(h.context.status.value, undefined);
    assert.equal(h.values.has(KEY), false);
  }
});
