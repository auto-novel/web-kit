import assert from 'node:assert/strict';
import test from 'node:test';
import { dom } from '../helpers/dom.mjs';

const Vue = await import('vue');
const { createComponentServer, installTestRouter } =
  await import('../helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const { default: ConfirmDialog } = await server.ssrLoadModule(
  '/src/ui/dialog/XConfirmDialog.vue',
);
const { default: Button } = await server.ssrLoadModule(
  '@nuxt/ui/components/Button.vue',
);

async function settle() {
  await Vue.nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
}

function mount(t) {
  const props = Vue.reactive({ open: true, loading: false, danger: true });
  const events = [];
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(ConfirmDialog, {
        ...props,
        title: 'Delete entry',
        description: 'This action cannot be undone.',
        transition: false,
        'onUpdate:open': (value) => events.push(['open', value]),
        onConfirm: () => events.push(['confirm']),
      }),
  });
  installTestRouter(app);
  app.mount(host);
  t.after(async () => {
    app.unmount();
    host.remove();
    await settle();
  });
  const panel = () => document.querySelector('[role="dialog"]');
  const buttons = () => [...panel().querySelectorAll('button')];
  return { props, events, panel, buttons };
}

function escape(panel) {
  panel.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
}

function nuxtButton(element) {
  let instance = element.__vueParentComponent;
  while (instance && instance.type !== Button) instance = instance.parent;
  assert.ok(instance, 'confirmation actions are real Nuxt buttons');
  return instance;
}

test('confirmation focuses cancel, maps dangerous action color, and leaves success closure to parent', async (t) => {
  const { props, events, panel, buttons } = mount(t);
  await settle();
  const [cancel, confirm] = buttons();
  assert.equal(cancel.textContent.trim(), '取消');
  assert.equal(confirm.textContent.trim(), '确认');
  assert.equal(document.activeElement, cancel);
  assert.equal(nuxtButton(cancel).props.color, 'neutral');
  assert.equal(nuxtButton(confirm).props.color, 'error');
  props.danger = false;
  await settle();
  assert.equal(nuxtButton(confirm).props.color, 'primary');
  confirm.click();
  await settle();
  assert.deepEqual(events, [['confirm']]);
  assert.ok(
    panel(),
    'confirm does not close before the parent reports success',
  );
  props.open = false;
  await settle();
  assert.equal(panel(), null);
});

test('submitting disables actions and refuses Escape/outside dismissal; cancel works again afterward', async (t) => {
  const { props, events, panel, buttons } = mount(t);
  await settle();
  props.loading = true;
  await settle();
  const [cancel, confirm] = buttons();
  assert.equal(cancel.disabled, true);
  assert.equal(confirm.disabled, true);
  assert.equal(confirm.textContent.trim(), '处理中…');
  cancel.click();
  confirm.click();
  escape(panel());
  document.body.dispatchEvent(
    new dom.window.PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );
  await settle();
  assert.deepEqual(events, []);
  assert.ok(panel());
  props.loading = false;
  await settle();
  escape(panel());
  await settle();
  assert.deepEqual(events, [['open', false]]);
  // Keep the controlled parent open to exercise cancellation separately.
  events.length = 0;
  cancel.click();
  await settle();
  assert.deepEqual(events, [['open', false]]);
});
