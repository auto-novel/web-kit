import assert from 'node:assert/strict';
import test from 'node:test';

import { ToastProvider, useToastManager } from 'reka-ui';
import { createRenderer, h } from 'vue';
import { Toast, toastManager } from '../../../src/ui/toast/index.ts';

// Mount the real Provider without requiring a browser or rendering ToastRoot's DOM.
function mountProvider(t) {
  const node = () => ({ children: [], parent: null });
  function remove(child) {
    if (child.parent) {
      const siblings = child.parent.children;
      siblings.splice(siblings.indexOf(child), 1);
      child.parent = null;
    }
  }
  const renderer = createRenderer({
    createElement: node,
    createText: node,
    createComment: node,
    insert(child, parent, anchor = null) {
      remove(child);
      const index = anchor
        ? parent.children.indexOf(anchor)
        : parent.children.length;
      parent.children.splice(index, 0, child);
      child.parent = parent;
    },
    remove,
    setText() {},
    setElementText() {},
    parentNode: (child) => child.parent,
    nextSibling(child) {
      const siblings = child.parent?.children ?? [];
      return siblings[siblings.indexOf(child) + 1] ?? null;
    },
    patchProp() {},
  });
  let manager;
  const app = renderer.createApp({
    render: () =>
      h(
        ToastProvider,
        { toastManager },
        {
          default: () =>
            h({
              setup() {
                manager = useToastManager();
                return () => null;
              },
            }),
        },
      ),
  });
  app.mount(node());
  t.after(() => app.unmount());
  return manager;
}

test('notification methods return unique IDs, forward options and add newest first', (t) => {
  const { toasts } = mountProvider(t);
  const onClose = () => {};
  const onRemove = () => {};
  const statuses = ['success', 'error', 'info', 'warning'];
  const ids = statuses.map((status) =>
    Toast[status](status, { duration: 0, onClose, onRemove }),
  );
  assert.equal(new Set(ids).size, statuses.length);
  assert.deepEqual(
    toasts.value.map(
      ({ id, status, description, open, duration, onClose, onRemove }) => ({
        id,
        status,
        description,
        open,
        duration,
        onClose,
        onRemove,
      }),
    ),
    statuses.toReversed().map((status, index) => ({
      id: ids.toReversed()[index],
      status,
      description: status,
      open: true,
      duration: 0,
      onClose,
      onRemove,
    })),
  );
});

test('Toast.update patches a single message without changing its ID or other messages', (t) => {
  const { toasts } = mountProvider(t);
  const id = Toast.info('before', { duration: 0 });
  const other = Toast.warning('other', { duration: 8000 });
  Toast.update(id, { message: 'after', status: 'success', duration: 1500 });
  assert.equal(toasts.value.length, 2);
  assert.equal(toasts.value[0].id, other);
  assert.equal(toasts.value[0].description, 'other');
  const updated = toasts.value[1];
  assert.equal(updated.id, id);
  assert.equal(updated.description, 'after');
  assert.equal(updated.status, 'success');
  assert.equal(updated.duration, 1500);
  Toast.update(id, { duration: undefined });
  assert.equal(toasts.value[1].duration, undefined);
  assert.equal(toasts.value[1].description, 'after');
});

test('Toast.dismiss closes only the selected message and invokes onClose once', (t) => {
  const { toasts } = mountProvider(t);
  let closed = 0;
  let removed = 0;
  const id = Toast.info('selected', {
    onClose: () => closed++,
    onRemove: () => removed++,
  });
  const other = Toast.success('other');
  Toast.dismiss(id);
  Toast.dismiss(id);
  Toast.update(id, { message: 'must not reopen' });
  Toast.update('missing', { message: 'ignored' });
  Toast.dismiss('missing');
  assert.equal(closed, 1);
  assert.equal(removed, 0); // Removal belongs to ToastRoot after the exit animation.
  assert.equal(toasts.value.length, 2);
  assert.equal(toasts.value[0].id, other);
  assert.equal(toasts.value[0].open, true);
  assert.equal(toasts.value[1].open, false);
  assert.equal(toasts.value[1].description, 'selected');
});

test('adding an existing ID updates the same toast and restarts its lifecycle', (t) => {
  const { toasts } = mountProvider(t);
  const id = Toast.info('before', { id: 'custom', duration: 0 });
  assert.equal(Toast.warning('after', { id, duration: 1000 }), id);
  assert.equal(toasts.value.length, 1);
  assert.equal(toasts.value[0].status, 'warning');
  assert.equal(toasts.value[0].duration, 1000);
  Toast.dismiss(id);
  Toast.info('new lifecycle', { id });
  assert.equal(toasts.value.length, 1);
  assert.equal(toasts.value[0].open, true);
});

test('Toast.promise supports per-stage lifecycle options and resets loading duration', async (t) => {
  const { toasts } = mountProvider(t);
  const operation = Promise.withResolvers();
  const pending = Toast.promise(
    operation.promise,
    {
      loading: { message: 'loading', duration: 0 },
      success: { message: 'done', duration: 1200 },
    },
    { id: 'promise-options', duration: 7000 },
  );
  assert.equal(toasts.value[0].id, 'promise-options');
  assert.equal(toasts.value[0].status, 'loading');
  assert.equal(toasts.value[0].description, 'loading');
  assert.equal(toasts.value[0].duration, 0);
  const result = { name: '设置' };
  operation.resolve(result);
  assert.equal(await pending, result);
  assert.equal(toasts.value.length, 1);
  assert.equal(toasts.value[0].id, 'promise-options');
  assert.equal(toasts.value[0].status, 'success');
  assert.equal(toasts.value[0].duration, 1200);
  assert.equal(toasts.value[0].description, 'done');

  await Toast.promise(Promise.resolve(), {
    loading: { message: 'loading', duration: 0 },
    success: 'done',
  });
  assert.equal(toasts.value[0].duration, undefined);
});

test('Toast.promise supports configured result messages without a loading toast', async (t) => {
  const { toasts } = mountProvider(t);
  let closed = 0;
  const reason = { data: { detail: 'detail' } };
  await assert.rejects(
    Toast.promise(Promise.reject(reason), {
      error: { message: 'failed', duration: 0, onClose: () => closed++ },
    }),
    (error) => error === reason,
  );
  assert.equal(toasts.value[0].description, 'failed');
  assert.equal(toasts.value[0].duration, 0);
  Toast.dismiss(toasts.value[0].id);
  assert.equal(closed, 1);
});

test('Toast.dismissAll closes toasts without prematurely removing them', (t) => {
  const { toasts, close } = mountProvider(t);
  Toast.success('before');
  const oldId = toasts.value[0].id;
  Toast.dismissAll();
  assert.equal(toasts.value.length, 1);
  assert.equal(toasts.value[0].open, false);

  Toast.error('after');
  assert.notEqual(toasts.value[0].id, oldId);
  close(oldId);
  assert.equal(toasts.value[0].description, 'after');
  assert.equal(toasts.value[0].open, true);
  Toast.dismissAll();
  assert.ok(toasts.value.every((toast) => !toast.open));
});

test('Toast.promise displays the literal error message and preserves the rejection', async (t) => {
  const { toasts } = mountProvider(t);
  const operation = Promise.withResolvers();
  const error = new Error('网络不可用');
  const pending = Toast.promise(operation.promise, {
    loading: '正在保存',
    success: '已保存',
    error: '保存失败',
  });
  const id = toasts.value[0].id;
  operation.reject(error);
  await assert.rejects(pending, (reason) => {
    assert.equal(reason, error);
    // 通知先于调用方的 catch 更新完成。
    assert.equal(toasts.value[0].status, 'error');
    return true;
  });
  assert.equal(toasts.value.length, 1);
  assert.equal(toasts.value[0].id, id);
  assert.equal(toasts.value[0].status, 'error');
  assert.equal(toasts.value[0].description, '保存失败');
  assert.equal(toasts.value[0].duration, undefined);
});

test('Toast.promise calls only the matching message callback once with the original value', async (t) => {
  const { toasts } = mountProvider(t);
  const value = { name: '设置' };
  const success = t.mock.fn((result) => ({
    message: `已保存 ${result.name}`,
    duration: 1200,
  }));
  const error = t.mock.fn((reason) => `自定义失败：${String(reason)}`);
  const operation = Promise.withResolvers();
  const pending = Toast.promise(operation.promise, {
    loading: '正在保存',
    success,
    error,
  });
  const id = toasts.value[0].id;
  assert.equal(success.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 0);
  operation.resolve(value);
  assert.equal(await pending, value);
  assert.equal(success.mock.callCount(), 1);
  assert.equal(success.mock.calls[0].arguments[0], value);
  assert.equal(error.mock.callCount(), 0);
  assert.equal(toasts.value[0].id, id);
  assert.equal(toasts.value[0].description, '已保存 设置');
  assert.equal(toasts.value[0].duration, 1200);

  for (const reason of [{ data: { detail: '不应自动追加' } }, undefined]) {
    await assert.rejects(
      Toast.promise(Promise.reject(reason), { success, error }),
      (caught) => caught === reason,
    );
    assert.equal(error.mock.calls.at(-1).arguments[0], reason);
    assert.equal(toasts.value[0].description, `自定义失败：${String(reason)}`);
  }
  assert.equal(error.mock.callCount(), 2);
  assert.equal(success.mock.callCount(), 1);
});

test('Toast.promise callbacks support strings, stage options and void success', async (t) => {
  const { toasts } = mountProvider(t);
  await Toast.promise(Promise.resolve(), {
    success: (value) => {
      assert.equal(value, undefined);
      return '已完成';
    },
  });
  assert.equal(toasts.value[0].description, '已完成');
  const reason = new Error('原始失败');
  let closed = 0;
  await assert.rejects(
    Toast.promise(Promise.reject(reason), {
      loading: { message: 'loading', duration: 0 },
      error: () => ({
        message: '完整错误文案',
        duration: 1500,
        onClose: () => closed++,
      }),
    }),
    (caught) => caught === reason,
  );
  assert.equal(toasts.value[0].description, '完整错误文案');
  assert.equal(toasts.value[0].duration, 1500);
  Toast.dismiss(toasts.value[0].id);
  assert.equal(closed, 1);
});

test('throwing message callbacks cannot replace success values or rejection reasons', async (t) => {
  mountProvider(t);
  const callbackError = new Error('文案生成失败');
  const reports = t.mock.method(console, 'error', () => {});
  const fail = () => {
    throw callbackError;
  };
  const value = { saved: true };
  const reason = new Error('原始失败');
  assert.equal(
    await Toast.promise(Promise.resolve(value), { success: fail }),
    value,
  );
  await assert.rejects(
    Toast.promise(Promise.reject(reason), { error: fail }),
    (caught) => caught === reason,
  );
  assert.equal(reports.mock.callCount(), 2);
  assert.ok(
    reports.mock.calls.every((call) => call.arguments[1] === callbackError),
  );
});

test('Toast.promise rejects even without error messages and closes loading', async (t) => {
  const { toasts } = mountProvider(t);
  // 失败原因不限于 Error，undefined 也必须保留为 rejection。
  for (const reason of [new Error('失败'), '失败', null, undefined]) {
    await assert.rejects(
      Toast.promise(Promise.reject(reason)),
      (error) => error === reason,
    );
  }
  assert.equal(toasts.value.length, 0);
  const operation = Promise.withResolvers();
  const pending = Toast.promise(operation.promise, { loading: '正在保存' });
  const reason = new Error('失败');
  operation.reject(reason);
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(toasts.value.length, 1);
  assert.equal(toasts.value[0].open, false);
});

test('Toast.promise preserves void success and skips success work on failure while running finally', async () => {
  assert.equal(await Toast.promise(Promise.resolve()), undefined);
  const reason = new Error('失败');
  let succeeded = false;
  let cleanedUp = false;
  const pending = Toast.promise(Promise.reject(reason))
    .then(() => {
      succeeded = true;
    })
    .finally(() => {
      cleanedUp = true;
    });
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(succeeded, false);
  assert.equal(cleanedUp, true);
});

test('Toast.promise notification failures never replace the operation result', async (t) => {
  mountProvider(t);
  const notificationError = new Error('通知故障');
  const reports = t.mock.method(console, 'error', () => {});
  const fail = () => {
    throw notificationError;
  };
  const reason = new Error('请求失败');
  const value = { saved: true };
  for (const method of ['add', 'update', 'close']) {
    const mock = t.mock.method(toastManager, method, fail);
    const messages =
      method === 'close'
        ? { loading: 'loading' }
        : { loading: 'loading', success: 'done', error: 'failed' };
    assert.equal(await Toast.promise(Promise.resolve(value), messages), value);
    await assert.rejects(
      Toast.promise(Promise.reject(reason), messages),
      (error) => error === reason,
    );
    mock.mock.restore();
  }
  assert.ok(reports.mock.callCount() >= 6);
  for (const call of reports.mock.calls) {
    assert.equal(call.arguments[1], notificationError);
  }
});

test('a late Promise result does not reopen a dismissed toast', async (t) => {
  const { toasts } = mountProvider(t);
  const operation = Promise.withResolvers();
  const pending = Toast.promise(operation.promise, {
    loading: '正在保存',
    success: '已保存',
    error: '保存失败',
  });
  Toast.dismissAll();
  operation.resolve('done');
  assert.equal(await pending, 'done');
  assert.equal(toasts.value[0].open, false);
  assert.equal(toasts.value[0].status, 'loading');
});

test("a new Provider does not inherit a previous Provider's toast list", (t) => {
  const first = mountProvider(t);
  Toast.success('first');
  const second = mountProvider(t);
  assert.equal(second.toasts.value.length, 0);
  Toast.error('shared event');
  assert.equal(first.toasts.value[0].description, 'shared event');
  assert.equal(second.toasts.value[0].description, 'shared event');
});
