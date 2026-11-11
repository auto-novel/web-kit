import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
after(() => dom.window.close());

// 虚拟时钟验证帧率无关的衰减，不等待真实动画。
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
const motion = new dom.window.EventTarget();
motion.matches = false;
window.matchMedia = () => motion;
function reduceMotion(value) {
  motion.matches = value;
  const event = new dom.window.Event('change');
  Object.defineProperty(event, 'matches', { value });
  motion.dispatchEvent(event);
}

const { effectScope, nextTick, reactive, shallowRef } = await import('vue');
const { useDragScroll } = await import('../../src/utils/useDragScroll.ts');

function createViewport() {
  const viewport = document.createElement('div');
  viewport.scrollLeft = viewport.scrollTop = 100;
  viewport.style.cursor = 'crosshair';
  viewport.style.userSelect = 'text';
  viewport.scrollTo = ({ left, top }) => {
    viewport.scrollLeft = Math.max(0, Math.min(1000, left));
    viewport.scrollTop = Math.max(0, Math.min(1000, top));
  };
  document.body.append(viewport);
  return viewport;
}
async function setup(t, initialOptions) {
  const viewport = createViewport();
  const target = shallowRef(viewport);
  const options = reactive(initialOptions ?? {});
  const scope = effectScope();
  const controls = scope.run(() =>
    useDragScroll(
      () => target.value,
      initialOptions === undefined
        ? undefined
        : {
            enabled: () => options.enabled ?? true,
            orientation: () => options.orientation ?? 'vertical',
            inertia: () => options.inertia ?? false,
          },
    ),
  );
  await nextTick();
  t.after(() => {
    scope.stop();
    viewport.remove();
    target.value?.remove();
    reduceMotion(false);
  });
  const pointer = (type, x = 50, y = 50, settings = {}) => {
    const { on, pointerType = 'mouse', pointerId = 1, ...init } = settings;
    const event = new dom.window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      buttons: 1,
      detail: 1,
      ...init,
    });
    Object.defineProperties(event, {
      pointerId: { value: pointerId },
      pointerType: { value: pointerType },
      timeStamp: { value: now },
    });
    (
      on ??
      (['pointerdown', 'click', 'dragstart'].includes(type)
        ? target.value
        : window)
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
  return { viewport, target, options, pointer, fling, scope, ...controls };
}

test('默认纵向无惯性：鼠标阈值、捕获点击抑制和拖动样式自动还原', async (t) => {
  const { viewport, pointer, dragging } = await setup(t);
  let clicks = 0;
  viewport.addEventListener('click', () => clicks++);
  pointer('pointerdown');
  pointer('pointermove', 20, 47);
  pointer('pointerup');
  assert.equal(viewport.scrollTop, 100);
  assert.equal(pointer('click').defaultPrevented, false);
  pointer('pointerdown');
  pointer('pointermove', 20, 30);
  assert.equal(dragging.value, true);
  assert.equal(viewport.scrollTop, 120);
  assert.equal(viewport.scrollLeft, 100);
  assert.equal(viewport.style.cursor, 'grabbing');
  assert.equal(viewport.style.userSelect, 'none');
  assert.equal(pointer('dragstart').defaultPrevented, true);
  pointer('pointerup');
  assert.equal(dragging.value, false);
  assert.equal(viewport.style.cursor, 'crosshair');
  assert.equal(viewport.style.userSelect, 'text');
  assert.equal(frames.size, 0);
  assert.equal(pointer('click', 50, 50, { detail: 0 }).defaultPrevented, false);
  assert.equal(pointer('click').defaultPrevented, true);
  assert.equal(pointer('click').defaultPrevented, false);
  assert.equal(clicks, 3);
});

test('只响应主键鼠标，避让交互元素及显式忽略区域', async (t) => {
  const { viewport, pointer, dragging } = await setup(t);
  for (const settings of [
    { pointerType: 'touch' },
    { pointerType: 'pen' },
    { button: 2 },
  ]) {
    pointer('pointerdown', 50, 50, settings);
    pointer('pointermove', 10, 10);
    assert.equal(dragging.value, false);
  }
  for (const html of [
    '<button><span>按钮</span></button>',
    '<a href="#"><span>链接</span></a>',
    '<input>',
    '<div contenteditable="true"><span>编辑</span></div>',
    '<div data-drag-scroll-ignore><span>忽略</span></div>',
  ]) {
    viewport.innerHTML = html;
    pointer('pointerdown', 50, 50, {
      on: viewport.querySelector('span, input'),
    });
    pointer('pointermove', 10, 10);
    assert.equal(dragging.value, false, html);
  }
  assert.equal(viewport.scrollTop, 100);
});

test('惯性逐渐衰减，不同帧率位移一致且最终停止', async (t) => {
  const results = [];
  for (const interval of [8, 16]) {
    const { viewport, fling, scope } = await setup(t, {
      orientation: 'horizontal',
      inertia: true,
    });
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
    const { pointer, scope } = await setup(t, { inertia: true });
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

test('双轴边界独立停止，原生输入与 stop 中断惯性', async (t) => {
  const { viewport, fling, stop } = await setup(t, {
    orientation: 'both',
    inertia: true,
  });
  viewport.scrollLeft = 950;
  fling();
  advance(16);
  assert.equal(viewport.scrollLeft, 1000);
  const top = viewport.scrollTop;
  advance(16);
  assert.equal(viewport.scrollLeft, 1000);
  assert.ok(viewport.scrollTop > top, '横轴触边不影响纵轴');
  for (const event of [
    new dom.window.Event('wheel'),
    new dom.window.Event('touchstart'),
    new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown' }),
    new dom.window.Event('pointerdown'),
    new dom.window.Event('blur'),
  ]) {
    window.dispatchEvent(event);
    assert.equal(frames.size, 0, event.type);
    fling();
    assert.equal(frames.size, 1);
  }
  stop();
  assert.equal(frames.size, 0);
});

test('reduced-motion 禁止并即时中断惯性，不影响直接拖动', async (t) => {
  const { viewport, fling } = await setup(t, { inertia: true });
  fling();
  assert.equal(frames.size, 1);
  reduceMotion(true);
  await nextTick();
  assert.equal(frames.size, 0);
  const before = viewport.scrollTop;
  fling();
  assert.ok(viewport.scrollTop > before);
  assert.equal(frames.size, 0);
});

test('响应式选项、target 切换及卸载清理监听、拖动样式和动画', async (t) => {
  const { viewport, target, pointer, options, dragging, fling, scope } =
    await setup(t, { inertia: true });
  pointer('pointerdown');
  pointer('pointermove', 10, 10);
  options.enabled = false;
  await nextTick();
  assert.equal(dragging.value, false);
  assert.equal(viewport.style.userSelect, 'text');
  const before = viewport.scrollTop;
  fling();
  assert.equal(viewport.scrollTop, before);
  options.enabled = true;
  await nextTick();
  fling();
  assert.equal(frames.size, 1);
  options.orientation = 'horizontal';
  await nextTick();
  assert.equal(frames.size, 0);
  pointer('pointerdown');
  pointer('pointermove', 10, 10);
  const replacement = createViewport();
  target.value = replacement;
  await nextTick();
  assert.equal(dragging.value, false);
  assert.equal(viewport.style.cursor, 'crosshair');
  pointer('pointerdown', 50, 50, { on: viewport });
  pointer('pointermove', 10, 10);
  assert.equal(dragging.value, false);
  fling();
  assert.equal(replacement.scrollLeft, 140);
  assert.equal(frames.size, 1);
  target.value = null;
  await nextTick();
  assert.equal(frames.size, 0);
  target.value = replacement;
  await nextTick();
  pointer('pointerdown');
  pointer('pointermove', 10, 10);
  scope.stop();
  assert.equal(dragging.value, false);
  assert.equal(replacement.style.cursor, 'crosshair');
  const stopped = replacement.scrollLeft;
  pointer('pointerdown');
  pointer('pointermove', 0, 0);
  assert.equal(replacement.scrollLeft, stopped);
  assert.equal(pointer('click').defaultPrevented, false);
  assert.equal(frames.size, 0);
});
