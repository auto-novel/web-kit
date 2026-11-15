import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { h } from 'vue';
import ui from '@nuxt/ui/vite';

import { webKitNuxtUiOptions } from '@novelia/web-kit/nuxt-ui';
import {
  createComponentServer,
  renderWithRouter as renderToString,
} from './helpers/component-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createComponentServer();

test('Nuxt UI 使用显式配置，不创建第二份主题状态或自动导入', () => {
  assert.equal(webKitNuxtUiOptions.colorMode, false);
  assert.equal(webKitNuxtUiOptions.autoImport, false);
  assert.equal(webKitNuxtUiOptions.components, false);
  assert.equal(webKitNuxtUiOptions.dts, false);
  assert.equal('empty' in webKitNuxtUiOptions.ui, false);
  for (const name of [
    'button',
    'input',
    'inputNumber',
    'textarea',
    'select',
    'selectMenu',
    'inputMenu',
    'dropdownMenu',
  ]) {
    assert.equal(webKitNuxtUiOptions.ui[name]?.variants?.size, undefined, name);
  }
});

test('链接支持禁用、原始渲染和调用方 class 覆盖', async () => {
  const load = async (name) =>
    (await server.ssrLoadModule(`@nuxt/ui/components/${name}.vue`)).default;
  const Link = await load('Link');
  const renderLink = (props) =>
    renderToString(h(Link, { to: '/', ...props }, () => '链接'));
  const disabledLink = await renderLink({ disabled: true });
  assert.match(disabledLink, /aria-disabled="true"/);
  assert.doesNotMatch(disabledLink, /hover:text-/);
  const customLink = await renderLink({
    class: 'text-default hover:text-error',
  });
  assert.match(customLink, /text-default hover:text-error/);
  assert.doesNotMatch(customLink, /text-primary/);
  assert.doesNotMatch(
    await renderLink({ raw: true }),
    /text-primary|focus-visible:outline/,
  );
});

test('真实 CSS 构建复用主题 token 和原生明暗类名，区分表面与文字色', async () => {
  const result = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [ui({ ...webKitNuxtUiOptions, root })],
    build: {
      write: false,
      minify: false,
      cssMinify: false,
      rollupOptions: {
        input: fileURLToPath(
          new URL('./fixtures/nuxt-ui.css', import.meta.url),
        ),
      },
    },
  });
  const css = result.output
    .filter(
      (asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'),
    )
    .map((asset) => String(asset.source))
    .join('\n');

  // 验证整条 CSS 接入链路，而不是逐项快照颜色值和第三方组件样式。
  assert.match(css, /--ui-primary:\s*#18a058/);
  assert.match(css, /:root\.dark\s*\{[^}]*--ui-primary:\s*#63e2b7/);
  assert.match(css, /:where\(\.dark,\s*\.dark \*\)/);
  assert.match(
    css,
    /\.bg-primary(?:\s*,[^{}]+)?\s*\{\s*background-color:\s*var\(--ui-primary\)/,
  );
  assert.match(css, /\.text-default\s*\{\s*color:\s*var\(--ui-text\)/);
  assert.match(
    css,
    /\.bg-default(?:\s*,[^{}]+)?\s*\{\s*background-color:\s*var\(--ui-bg\)/,
  );
  assert.match(
    css,
    /\.border-default\s*\{\s*border-color:\s*var\(--ui-border\)/,
  );
  assert.doesNotMatch(css, /data-theme|--ui-primary:\s*var\(--ui-primary\)/);
});
