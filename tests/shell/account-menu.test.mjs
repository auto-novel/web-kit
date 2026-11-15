import assert from 'node:assert/strict';
import test from 'node:test';
import { dom } from '../helpers/dom.mjs';

const Vue = await import('vue');
const { createMemoryHistory, createRouter } = await import('vue-router');
const { createComponentServer } =
  await import('../helpers/component-server.mjs');
const server = await createComponentServer({ dom: true });
const { default: AccountButton } = await server.ssrLoadModule(
  '/src/shell/account/UserAccountButton.vue',
);
const { webKitKey, webKitInternalsKey } =
  await server.ssrLoadModule('/src/context.ts');

async function settle() {
  await Vue.nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Vue.nextTick();
}

function key(element, value) {
  element.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: value,
      bubbles: true,
      cancelable: true,
    }),
  );
}

async function mount(t, initial = {}) {
  const state = Vue.reactive({
    signedIn: true,
    admin: false,
    adminMode: false,
    unread: true,
    strikes: true,
    options: [],
    ...initial,
  });
  const calls = { refresh: 0, logout: 0, toggle: 0 };
  const whoami = Vue.computed(() => ({
    isSignedIn: state.signedIn,
    isAdmin: state.admin,
    asAdmin: state.adminMode,
    roleLabel: state.admin ? '管理员' : '普通用户',
    user: state.signedIn
      ? { username: 'alice', createdAt: Date.UTC(2026, 0, 1) }
      : undefined,
  }));
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/profile/:id', '/penalties'].map((path) => ({
      path,
      component: { render: () => null },
    })),
  });
  await router.push('/');
  const host = document.createElement('div');
  document.body.append(host);
  const app = Vue.createApp({
    render: () => Vue.h(AccountButton, { options: state.options }),
  });
  app.use(router);
  app.provide(webKitKey, {
    whoami,
    logout: async () => {
      calls.logout++;
      state.signedIn = false;
      throw new Error('Remote session already expired');
    },
    theme: { theme: Vue.ref('light') },
  });
  app.provide(webKitInternalsKey, {
    options: {
      auth: { url: 'https://auth.example.com', app: 'test' },
      strikes: {
        get enabled() {
          return state.strikes;
        },
        to: { path: '/penalties' },
      },
    },
    attention: {
      status: Vue.computed(() => ({ strikes: { hasUnread: state.unread } })),
      refresh: async () => {
        calls.refresh++;
      },
    },
    session: {
      toggleAdminMode: () => {
        calls.toggle++;
        state.adminMode = !state.adminMode;
      },
    },
  });
  app.mount(host);
  t.after(async () => {
    app.unmount();
    host.remove();
    await settle();
  });
  const trigger = host.querySelector('button');
  async function open() {
    trigger.focus();
    key(trigger, 'ArrowDown');
    await settle();
    const menu = document.querySelector('[role="menu"]');
    assert.ok(menu, 'Nuxt menu opens in the body portal');
    assert.equal(host.contains(menu), false);
    return menu;
  }
  return { state, calls, router, host, trigger, open };
}

test('account menu preserves links, nested groups, unread state and Escape focus restoration', async (t) => {
  const { state, calls, router, trigger, open } = await mount(t, {
    options: [
      { key: 'profile', label: '个人主页', to: { path: '/profile/42' } },
      { key: 'divider', type: 'divider' },
      {
        key: 'group',
        type: 'group',
        label: '相关链接',
        children: [
          {
            key: 'external',
            type: 'external',
            label: '项目主页',
            href: 'https://example.com/',
            target: '_blank',
          },
        ],
      },
    ],
  });
  const menu = await open();
  assert.equal(calls.refresh, 1);
  assert.match(trigger.getAttribute('aria-label'), /有新的处罚记录/);
  assert.match(menu.textContent, /普通用户/);
  assert.match(menu.textContent, /注册于/);
  const strikes = menu.querySelector('a[href="/penalties"]');
  assert.match(strikes.getAttribute('aria-label'), /有新的处罚记录/);
  assert.ok(menu.querySelector('[role="separator"]'));
  const group = [...menu.querySelectorAll('[role="menuitem"]')].find((node) =>
    node.textContent.includes('相关链接'),
  );
  group.focus();
  key(group, 'ArrowRight');
  await settle();
  const external = document.querySelector('a[href="https://example.com/"]');
  assert.ok(external);
  assert.equal(external.target, '_blank');
  assert.match(external.rel, /noopener/);
  assert.match(external.rel, /noreferrer/);
  assert.equal(
    external.getAttribute('aria-label'),
    '项目主页（在新标签页打开）',
  );
  key(external, 'Escape');
  await settle();
  key(group, 'Escape');
  await settle();
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, trigger);

  state.unread = false;
  await settle();
  assert.doesNotMatch(trigger.getAttribute('aria-label'), /有新的处罚记录/);
  const reopened = await open();
  reopened.querySelector('a[href="/profile/42"]').click();
  await settle();
  assert.equal(router.currentRoute.value.path, '/profile/42');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('account menu omits empty option groups and updates when options change', async (t) => {
  const { state, open } = await mount(t);
  const menu = await open();
  const groups = () => [...menu.querySelectorAll('[data-slot="group"]')];
  assert.equal(groups().length, 2);
  assert.ok(groups().every((group) => group.children.length > 0));

  state.options = [{ key: 'profile', label: '个人主页', to: '/profile/42' }];
  await settle();
  assert.equal(groups().length, 3);
  assert.ok(menu.querySelector('a[href="/profile/42"]'));

  state.options = [];
  await settle();
  assert.equal(groups().length, 2);
  assert.equal(menu.querySelector('a[href="/profile/42"]'), null);
});

test('admin checkbox toggles mode without closing; logout tolerates an expired remote session', async (t) => {
  const { calls, trigger, open, host } = await mount(t, { admin: true });
  const menu = await open();
  const toggle = menu.querySelector('[role="menuitemcheckbox"]');
  assert.equal(toggle.getAttribute('aria-checked'), 'false');
  toggle.click();
  await settle();
  assert.equal(calls.toggle, 1);
  assert.equal(toggle.getAttribute('aria-checked'), 'true');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  const logout = [...menu.querySelectorAll('[role="menuitem"]')].find((node) =>
    node.textContent.includes('退出账号'),
  );
  logout.click();
  await settle();
  assert.equal(calls.logout, 1);
  assert.match(host.textContent, /登录\/注册/);
  assert.equal(document.querySelector('[role="menu"]'), null);
});

test('disabled strikes omit the entry and unread indicator; signed-out trigger opens login', async (t) => {
  const { state, host, calls, open } = await mount(t, { strikes: false });
  const menu = await open();
  assert.doesNotMatch(menu.textContent, /处罚记录/);
  assert.doesNotMatch(
    host.querySelector('button').getAttribute('aria-label'),
    /有新的处罚记录/,
  );
  assert.equal(menu.querySelector('[role="menuitemcheckbox"]'), null);
  key(menu, 'Escape');
  await settle();
  state.signedIn = false;
  await settle();
  host.querySelector('button').click();
  await settle();
  assert.ok(document.querySelector('[role="dialog"]'));
  assert.equal(calls.toggle, 0);
});
