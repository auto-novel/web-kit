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

test('链接、按钮与字段应用共享主题并允许调用方覆盖', async () => {
  const load = async (name) =>
    (await server.ssrLoadModule(`@nuxt/ui/components/${name}.vue`)).default;
  const [Link, Button, Input] = await Promise.all(
    ['Link', 'Button', 'Input'].map(load),
  );
  const renderLink = (props) =>
    renderToString(h(Link, { to: '/', ...props }, () => '链接'));
  for (const active of [false, true]) {
    const link = await renderLink({ active });
    assert.match(link, /\btext-primary\b/);
    assert.match(link, /hover:text-primary\/75/);
    assert.match(link, /focus-visible:outline-2/);
    assert.doesNotMatch(link, /text-muted|hover:text-default/);
  }
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

  const button = await renderToString(h(Button, {}, () => '测试'));
  assert.match(button, /rounded-sm/);
  assert.match(button, /font-normal/);
  assert.match(button, /px-2\.5 py-1\.5/);
  assert.doesNotMatch(button, /--nui-|min-h-10/);
  const input = await renderToString(h(Input, { modelValue: 'Novelia' }));
  assert.match(input, /bg-default/);
  assert.match(input, /ring-accented/);
  assert.match(input, /focus-visible:ring-primary/);
  assert.doesNotMatch(input, /min-h-10/);
  const error = await renderToString(h(Input, { color: 'error' }));
  assert.match(error, /ring-error/);
  assert.match(error, /focus-visible:ring-error/);
});

test('Tooltip 支持多行文字，保留默认外观并允许覆盖', async () => {
  const { default: theme } = await server.ssrLoadModule('#build/ui/tooltip');
  const { tv } = await server.ssrLoadModule('@nuxt/ui/runtime/utils/tv');
  const { useAppConfig } = await server.ssrLoadModule('#imports');
  const ui = tv({ extend: theme, ...useAppConfig().ui.tooltip })();
  const content = ui.content();
  const text = ui.text();
  assert.match(content, /h-auto max-w-64/);
  assert.doesNotMatch(content, /\bh-6\b/);
  for (const value of [
    'bg-default',
    'text-highlighted',
    'shadow-sm',
    'rounded-sm',
    'px-2.5',
    'py-1',
  ]) {
    assert.ok(content.includes(value), value);
  }
  for (const value of [
    'whitespace-pre-line',
    'break-words',
    'overflow-visible',
    'text-clip',
  ]) {
    assert.ok(text.includes(value), value);
  }
  assert.doesNotMatch(text, /truncate|whitespace-nowrap|overflow-hidden/);
  const custom = `${ui.content({ class: 'max-w-80' })} ${ui.text({ class: 'whitespace-normal' })}`;
  assert.match(custom, /max-w-80/);
  assert.doesNotMatch(custom, /max-w-64|whitespace-pre-line/);
});

test('页头标题省略、操作区同行，并允许调用方覆盖', async () => {
  const { default: PageHeader } = await server.ssrLoadModule(
    '@nuxt/ui/components/PageHeader.vue',
  );
  const render = (props = {}) =>
    renderToString(
      h(
        PageHeader,
        { title: '很长的页面标题', ...props },
        {
          links: () => h('button', '操作'),
        },
      ),
    );
  const classes = (html, slot) =>
    html.match(new RegExp(`<[^>]+data-slot="${slot}"[^>]*>`))[0];
  const html = await render();
  assert.match(classes(html, 'wrapper'), /flex-row flex-nowrap items-center/);
  assert.match(classes(html, 'title'), /truncate/);
  assert.match(classes(html, 'title'), /text-nowrap/);
  assert.match(classes(html, 'links'), /shrink-0 flex-nowrap/);
  const custom = await render({ ui: { title: 'text-wrap' } });
  assert.match(classes(custom, 'title'), /text-wrap/);
  assert.doesNotMatch(classes(custom, 'title'), /text-nowrap/);
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
