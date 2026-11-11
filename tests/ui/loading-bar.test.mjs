import assert from 'node:assert/strict';
import test from 'node:test';
import * as Vue from 'vue';
import '../helpers/register-source.mjs';
const { createLoadingBar } =
  await import('../../src/ui/loading-bar/manager.ts');
const { useLoadingBar } =
  await import('../../src/ui/loading-bar/useLoadingBar.ts');
import { createTestRenderer } from '../helpers/test-renderer.mjs';

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const manager = createLoadingBar();
  let view;
  const renderer = createTestRenderer(t);
  const app = renderer.createApp({
    setup() {
      view = useLoadingBar(manager);
      return () => Vue.h('div');
    },
  });
  const mounted = renderer.mount(app);
  return { ...manager, view, ...mounted, tick: (ms) => t.mock.timers.tick(ms) };
}

test('并发任务独立、结束幂等，批次中的失败保留至最后一个任务结束', () => {
  const { api, state } = createLoadingBar();
  const first = api.start();
  const second = api.start();
  first.error();
  first.error();
  first.finish();
  assert.equal(state.pending, 1);
  assert.equal(state.failed, true);
  second.finish();
  assert.equal(state.pending, 0);
  const next = api.start();
  assert.equal(state.failed, false);
  first.error();
  assert.equal(state.pending, 1);
  assert.equal(state.failed, false);
  next.finish();
});

test('Promise 包装透传原值与原始 rejection，并释放任务', async () => {
  const { api, state } = createLoadingBar();
  const value = {};
  const result = api.promise(Promise.resolve(value));
  assert.equal(state.pending, 1);
  assert.equal(await result, value);
  assert.equal(state.pending, 0);
  const reason = { message: 'original' };
  await assert.rejects(
    api.promise(Promise.reject(reason)),
    (error) => error === reason,
  );
  assert.equal(state.pending, 0);
  assert.equal(state.failed, true);
});

test('短任务不闪烁，延迟显示，未知进度不提前到达 100%', (t) => {
  const { api, view, tick } = setup(t);
  api.start().finish();
  tick(1000);
  assert.equal(view.rendered, false);
  const task = api.start();
  tick(179);
  assert.equal(view.rendered, false);
  tick(1);
  assert.equal(view.rendered, true);
  assert.equal(view.progress, 0);
  tick(16);
  assert.equal(view.progress, 80);
  for (let i = 0; i < 20; i++) tick(4000);
  assert.ok(view.progress > 80 && view.progress <= 95);
  task.finish();
  tick(0);
  assert.equal(view.progress, 100);
  assert.equal(view.status, 'success');
  tick(200);
  assert.equal(view.visible, false);
  tick(800);
  assert.equal(view.rendered, false);
});

test('最短展示时长、并发错误收尾，以及旧隐藏计时器不影响新任务', (t) => {
  const { api, view, tick } = setup(t);
  const first = api.start();
  const second = api.start();
  tick(180);
  first.error();
  assert.equal(view.status, 'loading');
  tick(5);
  second.finish();
  // 首帧前结束也应推进加载条，而非等到收尾才从 0 跳到 100。
  tick(11);
  assert.ok(view.progress > 0 && view.progress < 100);
  tick(283);
  assert.equal(view.status, 'loading');
  tick(1);
  assert.equal(view.status, 'error');
  tick(200);
  assert.equal(view.visible, false);
  const next = api.start();
  assert.equal(view.visible, true);
  assert.equal(view.status, 'loading');
  tick(16);
  tick(800);
  assert.equal(view.rendered, true);
  assert.equal(view.visible, true);
  assert.equal(view.status, 'loading');
  next.finish();
});

test('卸载清理计时器但不结束任务，重挂载恢复展示', (t) => {
  const { api, state, view, unmount, tick } = setup(t);
  const task = api.start();
  tick(180);
  unmount();
  tick(10000);
  assert.equal(view.progress, 0);
  assert.equal(state.pending, 1);
  const renderer = createTestRenderer(t);
  let nextView;
  const app = renderer.createApp({
    setup() {
      nextView = useLoadingBar({ api, state });
      return () => Vue.h('div');
    },
  });
  renderer.mount(app);
  tick(180);
  assert.equal(nextView.visible, true);
  task.finish();
  tick(300);
  assert.equal(nextView.status, 'success');
});
