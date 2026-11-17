import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';

import * as classes from '../../src/ui/classes.ts';
import { compileComponent } from '../helpers/compile-component.mjs';
import { createTestRenderer } from '../helpers/test-renderer.mjs';

const source = new URL(
  '../../src/ui/progress-circle/XProgressCircle.vue',
  import.meta.url,
);
const XProgressCircle = compileComponent(source, {
  vue: Vue,
  '../classes': classes,
});
async function render(props, slots) {
  const html = await renderToString(Vue.h(XProgressCircle, props, slots));
  return new JSDOM(html).window.document.body.firstElementChild;
}

// 不将 label 的一位小数舍入反向应用于实际进度或插槽值。
test('显示舍入但保留实际进度，越界和非有限值安全钳制', async () => {
  const root = await render({ percentage: 12.345 });
  assert.equal(root.textContent, '12.3%');
  assert.equal(root.getAttribute('aria-valuenow'), '12.345');
  for (const [percentage, expected] of [
    [-1, 0],
    [101, 100],
    [NaN, 0],
    [Infinity, 0],
    [-Infinity, 0],
  ]) {
    const root = await render({ percentage });
    assert.equal(root.getAttribute('aria-valuenow'), `${expected}`);
    assert.equal(root.textContent, `${expected}%`);
    assert.equal(
      root.querySelectorAll('svg > circle').length,
      expected ? 2 : 1,
    );
  }
});

test('分段按顺序钳制、跳过无效值且不改变中心进度', async () => {
  const root = await render({
    percentage: 17,
    segments: [
      { percentage: -10 },
      { percentage: NaN },
      { percentage: Infinity },
      { percentage: 30, color: 'success' },
      { percentage: 90 },
      { percentage: 10, color: 'error' },
    ],
  });
  const segments = [...root.querySelectorAll('svg > circle')].slice(1);
  assert.deepEqual(
    segments.map((circle) => [
      circle.getAttribute('stroke-dasharray'),
      Number(circle.getAttribute('stroke-dashoffset')),
    ]),
    [
      ['30 70', 0],
      ['70 30', -30],
    ],
  );
  assert.equal(root.textContent, '17%');
  assert.equal(root.getAttribute('aria-valuenow'), '17');
  const empty = await render({ percentage: 80, segments: [] });
  assert.equal(empty.querySelectorAll('circle').length, 1);
  assert.equal(empty.textContent, '80%');
});

test('插槽进度响应更新，钳制但不舍入，也不改变独立分段', async (t) => {
  const state = Vue.reactive({ percentage: 12.345 });
  const renderer = createTestRenderer(t);
  const { root } = renderer.mount(
    renderer.createApp({
      render: () =>
        Vue.h(
          XProgressCircle,
          { ...state, segments: [{ percentage: 35 }] },
          { default: ({ percentage }) => Vue.h('strong', `${percentage}`) },
        ),
    }),
  );
  const all = (node) => [node, ...node.children.flatMap(all)];
  const label = () => all(root).find((node) => node.tag === 'strong').text;
  assert.equal(label(), '12.345');
  state.percentage = 120;
  await Vue.nextTick();
  assert.equal(label(), '100');
  assert.equal(root.props['aria-valuenow'], 100);
  const segment = all(root).find((node) => node.props['stroke-dasharray']);
  assert.equal(segment.props['stroke-dasharray'], '35 65');
});
