import assert from 'node:assert/strict';
import test from 'node:test';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';
import { JSDOM } from 'jsdom';
import * as classes from '../../src/ui/classes.ts';
import { compileComponent } from '../helpers/compile-component.mjs';
import { createTestRenderer, dispatch } from '../helpers/test-renderer.mjs';

const XImageCompare = compileComponent(
  new URL('../../src/ui/image-compare/XImageCompare.vue', import.meta.url),
  { vue: Vue, '../classes': classes },
);
const images = { before: 'before.png', after: 'after.png', alt: '插图' };
async function render(props) {
  return new JSDOM(
    await renderToString(Vue.h(XImageCompare, { ...images, ...props })),
  ).window.document.body;
}

test('分界值限制在 0–100，非有限值回退中点', async () => {
  for (const [value, expected] of [
    [0, 0],
    [100, 100],
    [-20, 0],
    [130, 100],
    [NaN, 50],
  ]) {
    const body = await render({ modelValue: value });
    assert.equal(body.querySelector('input').value, String(expected));
  }
});

test('非受控拖动与换图保留位置；受控更新和禁用', async (t) => {
  const renderer = createTestRenderer(t);
  const props = Vue.reactive({ ...images });
  const updates = [];
  const app = renderer.createApp({
    render: () =>
      Vue.h(XImageCompare, {
        ...props,
        'onUpdate:modelValue': (value) => updates.push(value),
      }),
  });
  const { root } = renderer.mount(app);
  const input = root.children.find((child) => child.tag === 'input');
  input.valueAsNumber = 24.5;
  dispatch(input, 'input');
  await Vue.nextTick();
  assert.equal(input.props.value, 24.5);
  assert.deepEqual(updates, [24.5]);
  props.after = 'new.png';
  await Vue.nextTick();
  assert.equal(input.props.value, 24.5);
  assert.deepEqual(updates, [24.5]);
  props.modelValue = 80;
  await Vue.nextTick();
  assert.equal(input.props.value, 80);
  input.valueAsNumber = 30;
  dispatch(input, 'input');
  await Vue.nextTick();
  assert.equal(updates.at(-1), 30);
  assert.equal(input.props.value, 80);
  props.disabled = true;
  await Vue.nextTick();
  assert.equal(input.props.disabled, true);
  input.valueAsNumber = 10;
  dispatch(input, 'input');
  assert.equal(updates.at(-1), 30);
});
