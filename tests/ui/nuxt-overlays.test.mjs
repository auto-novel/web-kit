import assert from 'node:assert/strict';
import test from 'node:test';
import { dom } from '../helpers/dom.mjs';

const Vue = await import('vue');
const { createComponentServer, installTestRouter } =
  await import('../helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const load = async (name) =>
  (await server.ssrLoadModule(`@nuxt/ui/components/${name}.vue`)).default;
const [Modal, Slideover, InputMenu, Button] = await Promise.all(
  ['Modal', 'Slideover', 'InputMenu', 'Button'].map(load),
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

function escape(element) {
  element.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
}

for (const [name, Component] of [
  ['UModal', Modal],
  ['USlideover', Slideover],
]) {
  test(`${name} controlled body opens without a trigger and closes through its body slot`, async (t) => {
    const open = Vue.ref(false);
    const host = mount(t, () =>
      Vue.h(
        Component,
        {
          open: open.value,
          'onUpdate:open': (value) => {
            open.value = value;
          },
          title: 'Edit entry',
          description: 'Entry details',
          transition: false,
        },
        {
          body: ({ close }) =>
            Vue.h('button', { onClick: close }, 'Done editing'),
        },
      ),
    );
    await settle();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    open.value = true;
    await settle();
    const panel = document.querySelector('[role="dialog"]');
    assert.ok(panel);
    const overlay = document.querySelector('[data-slot="overlay"]');
    assert.ok(overlay);
    assert.ok(overlay.classList.contains('bg-black/45'));
    assert.equal(
      host.contains(panel),
      false,
      'content uses the real body portal',
    );
    assert.equal(
      document
        .getElementById(panel.getAttribute('aria-labelledby'))
        .textContent.trim(),
      'Edit entry',
    );
    assert.equal(
      document
        .getElementById(panel.getAttribute('aria-describedby'))
        .textContent.trim(),
      'Entry details',
    );
    panel.querySelector('[data-slot="body"] button').click();
    await settle();
    assert.equal(open.value, false);
    assert.equal(document.querySelector('[role="dialog"]'), null);
  });

  test(`${name} trigger opens body; nested InputMenu portal selects without dismissing parent and close restores focus`, async (t) => {
    const selected = Vue.ref();
    const host = mount(t, () =>
      Vue.h(
        Component,
        { title: 'Choose reason', transition: false },
        {
          default: () => Vue.h(Button, {}, () => 'Open editor'),
          body: () =>
            Vue.h(InputMenu, {
              modelValue: selected.value,
              'onUpdate:modelValue': (value) => {
                selected.value = value;
              },
              items: ['Spam', 'Abuse'],
              placeholder: 'Reason',
            }),
        },
      ),
    );
    const trigger = host.querySelector('button');
    trigger.focus();
    trigger.click();
    await settle();
    const panel = document.querySelector('[role="dialog"]');
    assert.ok(panel);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    const input = panel.querySelector('input[role="combobox"]');
    input.focus();
    input.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    const menu = document.querySelector('[role="listbox"]');
    assert.ok(menu, 'the actual Nuxt InputMenu opens');
    assert.equal(
      panel.contains(menu),
      false,
      'the menu has its own body portal',
    );
    const option = [...menu.querySelectorAll('[role="option"]')].find((node) =>
      node.textContent.includes('Spam'),
    );
    assert.ok(option);
    option.click();
    await settle();
    assert.equal(selected.value, 'Spam');
    assert.equal(document.querySelector('[role="listbox"]'), null);
    assert.equal(document.querySelector('[role="dialog"]'), panel);
    assert.equal(input.value, 'Spam');
    escape(input);
    await settle();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, trigger);
  });
}
