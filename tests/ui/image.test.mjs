import assert from 'node:assert/strict';
import test from 'node:test';
import { dom } from '../helpers/dom.mjs';
const Vue = await import('vue');
const { createComponentServer, installTestRouter } =
  await import('../helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const { default: XImage } = await server.ssrLoadModule(
  '/src/ui/image/XImage.vue',
);
const { default: XImageGroup } = await server.ssrLoadModule(
  '/src/ui/image/XImageGroup.vue',
);
async function settle() {
  await Vue.nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
}
function mount(t, render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({ render });
  installTestRouter(app);
  app.mount(host);
  t.after(async () => {
    app.unmount();
    host.remove();
    await settle();
  });
  return host;
}
const panel = () => document.querySelector('[role="dialog"]');
const key = (element, key) =>
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );

test('单图延迟加载高清图、展示状态、关闭并恢复焦点', async (t) => {
  const host = mount(t, () =>
    Vue.h(XImage, {
      src: 'small.png',
      previewSrc: 'large.png',
      alt: '封面',
    }),
  );
  await settle();
  const trigger = host.querySelector('[role="button"]');
  assert.equal(panel(), null);
  assert.equal(document.querySelector('img[src="large.png"]'), null);
  trigger.focus();
  key(trigger, 'Enter');
  await settle();
  assert.ok(panel());
  assert.equal(panel().querySelector('img').getAttribute('src'), 'large.png');
  const download = panel().querySelector('[aria-label="下载图片"]');
  assert.equal(download.getAttribute('href'), 'large.png');
  assert.equal(download.hasAttribute('download'), true);
  assert.ok(panel().querySelector('[role="status"]'));
  panel().querySelector('img').dispatchEvent(new Event('error'));
  await settle();
  assert.equal(
    panel().querySelector('[role="alert"]').textContent,
    '图片加载失败',
  );
  key(panel(), 'Escape');
  await settle();
  assert.equal(panel(), null);
  assert.equal(document.activeElement, trigger);
});

test('分组更新高清地址重置加载状态和下载地址，删除当前项关闭预览', async (t) => {
  const items = Vue.ref(['a', 'b', 'c']);
  const hires = Vue.ref(false);
  const host = mount(t, () =>
    Vue.h(XImageGroup, null, {
      default: () =>
        Vue.h(
          'div',
          items.value.map((id) =>
            Vue.h(XImage, {
              key: id,
              src: `${id}.png`,
              previewSrc: hires.value ? `${id}-hi.png` : undefined,
              alt: id,
            }),
          ),
        ),
    }),
  );
  await settle();
  host.querySelectorAll('[role="button"]')[1].click();
  await settle();
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b.png');
  const download = panel().querySelector('[download]');
  assert.equal(download.getAttribute('href'), 'b.png');
  panel().querySelector('img').dispatchEvent(new Event('load'));
  await settle();
  assert.equal(panel().querySelector('[role="status"]'), null);
  hires.value = true;
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b-hi.png');
  assert.equal(download.getAttribute('href'), 'b-hi.png');
  assert.ok(panel().querySelector('[role="status"]'));
  panel().querySelector('img').dispatchEvent(new Event('load'));
  await settle();
  assert.equal(panel().querySelector('[role="status"]'), null);
  items.value = ['c', 'a'];
  await settle();
  assert.equal(panel(), null);
});

test('后代独立重排同步序号和禁用边界，翻页遵循新 DOM 顺序', async (t) => {
  const items = Vue.ref(['a', 'b', 'c']);
  const Child = Vue.defineComponent({
    setup: () => () =>
      Vue.h(
        'div',
        items.value.map((id) => Vue.h(XImage, { key: id, src: `${id}.png` })),
      ),
  });
  const host = mount(t, () =>
    Vue.h(XImageGroup, null, { default: () => Vue.h(Child) }),
  );
  await settle();
  host.querySelector('[role="button"]').click();
  await settle();
  assert.equal(panel().querySelector('[aria-label="上一张"]').disabled, true);
  items.value = ['c', 'b', 'a'];
  await settle();
  assert.match(panel().textContent, /3 \/ 3/);
  assert.equal(panel().querySelector('[aria-label="上一张"]').disabled, false);
  assert.equal(panel().querySelector('[aria-label="下一张"]').disabled, true);
  panel().querySelector('[aria-label="上一张"]').click();
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b.png');
  key(panel().querySelector('button'), 'ArrowLeft');
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'c.png');
});

test('空地址和关闭预览的图片不参与导航，当前项失效即关闭', async (t) => {
  const source = Vue.ref('b.png');
  const enabled = Vue.ref(true);
  const host = mount(t, () =>
    Vue.h(XImageGroup, null, {
      default: () => [
        Vue.h(XImage, { src: 'a.png' }),
        Vue.h(XImage, { src: '  ' }),
        Vue.h(XImage, { src: 'disabled.png', preview: false }),
        Vue.h(XImage, { src: source.value, preview: enabled.value }),
      ],
    }),
  );
  await settle();
  assert.equal(host.querySelectorAll('[role="button"]').length, 2);
  host.querySelector('[role="button"]').click();
  await settle();
  assert.match(panel().textContent, /1 \/ 2/);
  panel().querySelector('[aria-label="下一张"]').click();
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b.png');
  source.value = '';
  await settle();
  assert.equal(panel(), null);
  source.value = 'b.png';
  await settle();
  host.querySelectorAll('[role="button"]')[1].click();
  await settle();
  enabled.value = false;
  await settle();
  assert.equal(panel(), null);
});

test('缩略图原生属性和事件可用，失败反馈可定制，换图恢复', async (t) => {
  const source = Vue.ref('a.png');
  const received = [];
  const host = mount(t, () =>
    Vue.h(
      XImage,
      {
        src: source.value,
        preview: false,
        alt: '封面',
        imgAttrs: {
          srcset: 'a-2x.png 2x',
          decoding: 'async',
          onLoad: () => received.push('native-load'),
        },
        onLoad: (event) => received.push(event.type),
        onError: (event) => received.push(event.type),
      },
      { error: () => '封面暂不可用' },
    ),
  );
  await settle();
  const img = host.querySelector('img');
  assert.equal(img.getAttribute('srcset'), 'a-2x.png 2x');
  assert.equal(img.getAttribute('decoding'), 'async');
  assert.equal(host.querySelector('[tabindex]'), null);
  img.click();
  key(img.parentElement, 'Enter');
  await settle();
  assert.equal(panel(), null);
  img.dispatchEvent(new Event('load'));
  img.dispatchEvent(new Event('error'));
  await settle();
  assert.deepEqual(received, ['native-load', 'load', 'error']);
  assert.equal(host.querySelector('[role="img"]').textContent, '封面暂不可用');
  source.value = 'b.png';
  await settle();
  assert.equal(host.querySelector('[role="img"]'), null);
});

function touch(target, type, points, changed = points) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const list = (values) =>
    values.map(([clientX, clientY, identifier = 1]) => ({
      clientX,
      clientY,
      identifier,
    }));
  Object.defineProperties(event, {
    touches: { value: list(points) },
    changedTouches: { value: list(changed) },
  });
  target.dispatchEvent(event);
}
function swipe(target, dx, dy = 0) {
  touch(target, 'touchstart', [[100, 100]]);
  touch(target, 'touchmove', [[100 + dx, 100 + dy]]);
  touch(target, 'touchend', [], [[100 + dx, 100 + dy]]);
}

test('触屏左右滑动每次只切一张，边界停止且不误关预览', async (t) => {
  const host = mount(t, () =>
    Vue.h(XImageGroup, null, {
      default: () =>
        ['a', 'b', 'c'].map((id) =>
          Vue.h(XImage, { src: `${id}.png`, key: id }),
        ),
    }),
  );
  await settle();
  host.querySelector('[role="button"]').click();
  await settle();
  const stage = panel().querySelector('img').parentElement;
  swipe(stage, -250);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b.png');
  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    detail: 1,
  });
  stage.dispatchEvent(click);
  await settle();
  assert.equal(click.defaultPrevented, true);
  assert.ok(panel());
  swipe(panel().querySelector('img'), -100);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'c.png');
  swipe(stage, -100);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'c.png');
  swipe(stage, 100);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b.png');
  swipe(stage, 100);
  await settle();
  swipe(stage, 100);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'a.png');
  touch(stage, 'touchstart', [[100, 100]]);
  touch(stage, 'touchend', [], [[100, 100]]);
  stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  await settle();
  assert.equal(panel(), null, '轻点空白仍关闭');
});

test('忽略短滑、纵向/斜向、多指、取消和工具栏手势；单图不切换', async (t) => {
  const host = mount(t, () =>
    Vue.h(XImageGroup, null, {
      default: () =>
        ['a', 'b'].map((id) => Vue.h(XImage, { src: `${id}.png`, key: id })),
    }),
  );
  await settle();
  host.querySelector('[role="button"]').click();
  await settle();
  const stage = panel().querySelector('img').parentElement;
  for (const [dx, dy] of [
    [-49, 0],
    [-80, 120],
    [-60, 50],
  ]) {
    swipe(stage, dx, dy);
    await settle();
    assert.equal(panel().querySelector('img').getAttribute('src'), 'a.png');
  }
  swipe(panel().querySelector('[aria-label="下一张"] svg'), -100);
  touch(stage, 'touchstart', [[100, 100]]);
  touch(stage, 'touchstart', [
    [100, 100],
    [150, 100, 2],
  ]);
  touch(stage, 'touchend', [[100, 100]], [[150, 100, 2]]);
  touch(stage, 'touchend', [], [[0, 100]]);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'a.png');
  touch(stage, 'touchstart', [[100, 100]]);
  touch(stage, 'touchcancel', []);
  touch(stage, 'touchend', [], [[0, 100]]);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'a.png');
  panel().querySelector('[aria-label="下一张"]').click();
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'b.png');
  panel().querySelector('[aria-label="关闭预览"]').click();
  await settle();

  const single = mount(t, () => Vue.h(XImage, { src: 'single.png' }));
  single.querySelector('[role="button"]').click();
  await settle();
  swipe(panel().querySelector('img'), -100);
  await settle();
  assert.equal(panel().querySelector('img').getAttribute('src'), 'single.png');
  assert.equal(panel().querySelector('[aria-label="下一张"]'), null);
});

test('移动或排序拖动不误开预览，普通点击和空白关闭正常', async (t) => {
  const host = mount(t, () => Vue.h(XImage, { src: 'cover.png' }));
  await settle();
  const trigger = host.querySelector('[role="button"]');
  const pointer = (target, type, x) =>
    target.dispatchEvent(
      new dom.window.PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: 0,
      }),
    );
  pointer(trigger, 'pointerdown', 0);
  pointer(window, 'pointermove', 20);
  pointer(window, 'pointerup', 20);
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  await settle();
  assert.equal(panel(), null);
  pointer(trigger, 'pointerdown', 0);
  trigger.dispatchEvent(new Event('dragstart', { bubbles: true }));
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  await settle();
  assert.equal(panel(), null);
  pointer(trigger, 'pointerdown', 0);
  pointer(window, 'pointerup', 0);
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  await settle();
  assert.ok(panel());
  panel().querySelector('img').click();
  await settle();
  assert.ok(panel());
  panel().querySelector('img').parentElement.click();
  await settle();
  assert.equal(panel(), null);
});
