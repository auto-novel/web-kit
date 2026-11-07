import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
after(() => dom.window.close());

// 用虚拟时钟验证采样窗口和帧率无关的衰减，不等待真实动画。
let now = 0;
let nextFrame = 0;
const frames = new Map();
window.performance.now = () => now;
window.requestAnimationFrame = (callback) => {
  frames.set(++nextFrame, callback);
  return nextFrame;
};
window.cancelAnimationFrame = (id) => frames.delete(id);
function advance(ms) {
  now += ms;
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(now);
}

const { effectScope, nextTick, reactive } = await import('vue');
const { useDragScroll } =
  await import('../../src/ui/scroll-area/useDragScroll.ts');

async function setup(t, orientation = 'vertical') {
  const props = reactive({
    dragScroll: 'inertia',
    orientation,
  });
  const scope = effectScope();
  const handlers = scope.run(() => useDragScroll(props));
  await nextTick();
  const viewport = document.createElement('div');
  viewport.scrollLeft = viewport.scrollTop = 100;
  viewport.scrollTo = ({ left, top }) => {
    viewport.scrollLeft = Math.max(0, Math.min(1000, left));
    viewport.scrollTop = Math.max(0, Math.min(1000, top));
  };
  viewport.addEventListener('pointerdown', handlers.onPointerDown);
  viewport.addEventListener('click', handlers.onClick, true);
  t.after(() => scope.stop());
  const pointer = (type, x = 50, y = 50) => {
    const event = new dom.window.MouseEvent(type, {
      cancelable: true,
      clientX: x,
      clientY: y,
      buttons: 1,
      detail: 1,
    });
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      pointerType: { value: 'mouse' },
      timeStamp: { value: now },
    });
    (type === 'pointerdown' || type === 'click'
      ? viewport
      : window
    ).dispatchEvent(event);
    return event;
  };
  const fling = () => {
    pointer('pointerdown');
    advance(20);
    pointer('pointermove', 30, 30);
    advance(20);
    pointer('pointermove', 10, 10);
    pointer('pointerup');
  };
  return { viewport, pointer, fling, scope, ...handlers };
}

test('阈值区分点击和拖动，只拦截拖动后的那次点击', async (t) => {
  const { viewport, pointer, dragging } = await setup(t);
  pointer('pointerdown');
  pointer('pointermove', 50, 47);
  pointer('pointerup');
  assert.equal(viewport.scrollTop, 100);
  assert.equal(pointer('click').defaultPrevented, false);
  pointer('pointerdown');
  pointer('pointermove', 50, 30);
  assert.equal(dragging.value, true);
  assert.equal(viewport.scrollTop, 120);
  pointer('pointerup');
  assert.equal(dragging.value, false);
  assert.equal(pointer('click').defaultPrevented, true);
  assert.equal(pointer('click').defaultPrevented, false);
});

test('惯性逐渐衰减，不同帧率位移一致且最终停止', async (t) => {
  const results = [];
  for (const interval of [8, 16]) {
    const { viewport, fling, scope } = await setup(t, 'horizontal');
    fling();
    assert.equal(frames.size, 1);
    const start = viewport.scrollLeft;
    for (let time = 0; time < 160; time += interval) advance(interval);
    results.push(viewport.scrollLeft - start);
    assert.equal(viewport.scrollTop, 100);
    const before = viewport.scrollLeft;
    for (let time = 0; time < 160; time += interval) advance(interval);
    assert.ok(viewport.scrollLeft - before < results.at(-1));
    for (let frame = 0; frames.size && frame < 200; frame++) advance(interval);
    assert.equal(frames.size, 0);
    scope.stop();
  }
  assert.ok(Math.abs(results[0] - results[1]) < 0.001);
});

test('释放速度只取近期样本，低速、停顿或取消不启动惯性', async (t) => {
  for (const mode of ['slow', 'pause', 'cancel', 'recent']) {
    const { pointer, scope } = await setup(t);
    pointer('pointerdown');
    advance(20);
    pointer('pointermove', 50, mode === 'slow' ? 45 : 10);
    advance(mode === 'pause' ? 150 : 60);
    if (mode === 'recent') {
      pointer('pointermove', 50, 9);
      advance(50);
      pointer('pointermove', 50, 8);
    }
    pointer(mode === 'cancel' ? 'pointercancel' : 'pointerup');
    assert.equal(frames.size, 0, mode);
    scope.stop();
  }
});

test('边界逐轴停止，输入接管和作用域销毁取消待执行帧', async (t) => {
  const { viewport, fling, scope } = await setup(t, 'both');
  viewport.scrollLeft = 950;
  fling();
  advance(16);
  assert.equal(viewport.scrollLeft, 1000);
  const top = viewport.scrollTop;
  advance(16);
  assert.equal(viewport.scrollLeft, 1000);
  assert.ok(viewport.scrollTop > top, '横轴触边不影响纵轴');
  window.dispatchEvent(new dom.window.Event('wheel'));
  assert.equal(frames.size, 0);
  const stopped = viewport.scrollTop;
  advance(16);
  assert.equal(viewport.scrollTop, stopped);
  fling();
  assert.equal(frames.size, 1);
  scope.stop();
  assert.equal(frames.size, 0);
});
