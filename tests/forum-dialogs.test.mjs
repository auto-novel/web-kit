import assert from 'node:assert/strict';
import test from 'node:test';
import { dom } from './helpers/dom.mjs';
const Vue = await import('vue');
const { createComponentServer, installTestRouter } =
  await import('./helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const { default: InputMenu } = await server.ssrLoadModule(
  '@nuxt/ui/components/InputMenu.vue',
);
const { default: Button } = await server.ssrLoadModule(
  '@nuxt/ui/components/Button.vue',
);
const { default: DialogComponent } = await server.ssrLoadModule(
  '@nuxt/ui/components/Modal.vue',
);

import { compileComponent } from './helpers/compile-component.mjs';

function mountModeration(t, { action = 'strike', failure = null } = {}) {
  let resolveStrike;
  let rejectStrike;
  const strike = new Promise((resolve, reject) => {
    resolveStrike = resolve;
    rejectStrike = reject;
  });
  const requests = [];
  const deleted = [];
  const effects = [];
  const whoami = Vue.ref({ user: { id: 1 }, asAdmin: true });
  const Dialog = compileComponent(
    new URL('../src/forum/UserModerationDialog.vue', import.meta.url),
    {
      vue: Vue,
      '../context': {
        useWebKitInternals: () => ({
          session: { whoami },
          createStrike: (request) => {
            requests.push(request);
            return strike;
          },
          banUser: (request) => {
            requests.push(request);
            return strike;
          },
        }),
      },
      '@nuxt/ui/components/InputMenu.vue': InputMenu,
      '@nuxt/ui/components/Button.vue': Button,
      '@nuxt/ui/components/Modal.vue': DialogComponent,
      '../ui/toast': {
        Toast: {
          success: (message) => effects.push(['success', message]),
          error: (message) => effects.push(['error', message]),
        },
      },
      '../ui/toast/apiError': {
        getApiErrorMessage: () => 'Request failed',
      },
    },
  );
  const props = Vue.reactive({
    open: true,
    action,
    userId: 2,
    username: 'author',
    evidence: 'Comment A',
    deleteComment: async () => {
      deleted.push(10);
      if (failure === 'cleanup') throw new Error('Delete failed');
    },
    deleteCommentsByAuthor: async (id) => {
      deleted.push(id);
      if (failure === 'cleanup') throw new Error('Delete failed');
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () =>
      Vue.h(Dialog, {
        ...props,
        'onUpdate:open': (open) => effects.push(['open', open]),
        onCommentDeleted: () => effects.push(['commentDeleted']),
        onCommentsDeleted: () => effects.push(['commentsDeleted']),
      }),
  });
  installTestRouter(app);
  app.mount(host);
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
    host.remove();
  };
  t.after(unmount);
  function find(tag) {
    return document.querySelector(`[role="dialog"] ${tag}`);
  }
  async function submit() {
    await Vue.nextTick();
    const input = find('input[role="combobox"]');
    input.value = 'Reason';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    if (action === 'ban') {
      const checkbox = find('input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    }
    await Vue.nextTick();
    // Keep the submission promise observable to verify post-unmount cleanup.
    const completion = find('form').__vnode.props.onSubmit(
      new dom.window.Event('submit', { cancelable: true }),
    );
    assert.equal(requests.length, 1);
    await Vue.nextTick();
    assert.equal(input.readOnly, true);
    let menu = input.__vueParentComponent;
    while (menu && menu.type !== InputMenu) menu = menu.parent;
    assert.ok(menu, 'the reason field uses the actual Nuxt InputMenu');
    menu.emit('update:modelValue', 'Changed while submitting');
    await Vue.nextTick();
    assert.equal(menu.props.modelValue, 'Reason');
    return { completion };
  }
  return {
    unmount,
    props,
    whoami,
    requests,
    deleted,
    effects,
    submit,
    resolveStrike,
    rejectStrike,
  };
}

test('strike completes captured cleanup after unmount with a global toast but no dialog events', async (t) => {
  const dialog = mountModeration(t);
  const { completion } = await dialog.submit();
  dialog.unmount();
  dialog.resolveStrike();
  await completion;
  assert.deepEqual(dialog.deleted, [10]);
  assert.deepEqual(dialog.effects, [
    ['success', '已处罚 @author，并删除被处罚的评论'],
  ]);
});

test('same-author target change cleans the original comment without notifying the new target', async (t) => {
  const dialog = mountModeration(t);
  const { completion } = await dialog.submit();
  dialog.props.deleteComment = async () => {
    dialog.deleted.push(11);
  };
  dialog.props.evidence = 'Comment B';
  await Vue.nextTick();
  dialog.resolveStrike();
  await completion;
  assert.deepEqual(dialog.deleted, [10]);
  assert.deepEqual(dialog.effects, [
    ['success', '已处罚 @author，并删除被处罚的评论'],
  ]);
});

test('switching viewer away and back after unmount prevents captured cleanup', async (t) => {
  const dialog = mountModeration(t);
  const { completion } = await dialog.submit();
  dialog.unmount();
  dialog.whoami.value = { user: { id: 3 }, asAdmin: true };
  dialog.whoami.value = { user: { id: 1 }, asAdmin: true };
  dialog.resolveStrike();
  await completion;
  assert.deepEqual(dialog.deleted, []);
  assert.deepEqual(dialog.effects, [['success', '已处罚 @author']]);
});

test('request failure stays open; cleanup failure preserves moderation success; successful deletion notifies the UI', async (t) => {
  for (const action of ['strike', 'ban']) {
    for (const failure of ['request', 'cleanup', null]) {
      const dialog = mountModeration(t, { action, failure });
      const { completion } = await dialog.submit();
      if (failure === 'request')
        dialog.rejectStrike(new Error('Request failed'));
      else dialog.resolveStrike();
      await completion;
      const strike = action === 'strike';
      assert.deepEqual(dialog.requests, [
        {
          username: 'author',
          reason: 'Reason',
          ...(strike ? { evidence: 'Comment A', point: 1 } : {}),
        },
      ]);
      assert.deepEqual(
        dialog.deleted,
        failure === 'request' ? [] : [strike ? 10 : 2],
      );
      assert.deepEqual(
        dialog.effects,
        failure === 'request'
          ? [['error', 'Request failed']]
          : [
              ...(failure === 'cleanup'
                ? [
                    [
                      'error',
                      `${strike ? '处罚' : '封禁'}已成功，但删除评论失败，请手动删除`,
                    ],
                  ]
                : [
                    [strike ? 'commentDeleted' : 'commentsDeleted'],
                    [
                      'success',
                      strike
                        ? '已处罚 @author，并删除被处罚的评论'
                        : '已封禁 @author，并删除该用户的全部评论',
                    ],
                  ]),
              ['open', false],
            ],
      );
      dialog.unmount();
    }
  }
});
