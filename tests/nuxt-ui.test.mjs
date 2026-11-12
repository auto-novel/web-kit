import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createSSRApp, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { renderToString } from 'vue/server-renderer';
import ui from '@nuxt/ui/vite';

import { webKitNuxtUiOptions } from '@novelia/web-kit/nuxt-ui';

const root = fileURLToPath(new URL('..', import.meta.url));

test('Nuxt UI 使用显式配置，不创建第二份主题状态或自动导入', () => {
  assert.equal(webKitNuxtUiOptions.colorMode, false);
  assert.equal(webKitNuxtUiOptions.autoImport, false);
  assert.equal(webKitNuxtUiOptions.components, false);
  assert.equal(webKitNuxtUiOptions.dts, false);
  assert.deepEqual(webKitNuxtUiOptions.ui.button.slots, {
    base: 'cursor-pointer rounded-sm font-normal',
  });
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
    assert.equal(webKitNuxtUiOptions.ui[name].variants?.size, undefined, name);
  }
});

test('按钮保留默认状态和尺寸，字段与滑块应用轻量主题', async () => {
  const server = await createServer({
    configFile: false,
    root,
    logLevel: 'error',
    plugins: [vue(), ui({ ...webKitNuxtUiOptions, root })],
    server: { middlewareMode: true, watch: null, ws: false },
  });
  try {
    const { default: Button } = await server.ssrLoadModule(
      '@nuxt/ui/components/Button.vue',
    );
    const { default: Input } = await server.ssrLoadModule(
      '@nuxt/ui/components/Input.vue',
    );
    const { default: Link } = await server.ssrLoadModule(
      '@nuxt/ui/components/Link.vue',
    );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => null } }],
    });
    await router.push('/');
    const renderLink = async (props) => {
      const app = createSSRApp({
        render: () => h(Link, { to: '/', ...props }, () => '链接'),
      });
      app.use(router);
      return renderToString(app);
    };
    // 普通链接不随路由匹配变色，保留禁用状态与调用方覆盖能力。
    for (const active of [false, true]) {
      const link = await renderLink({ active });
      assert.match(link, /href="\/"/);
      const classes = link.match(/class="([^"]*)"/)[1].split(/\s+/);
      for (const value of [
        'text-primary',
        'hover:text-primary-hover',
        'transition-colors',
        'rounded-sm',
        'outline-primary',
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
      ])
        assert.ok(classes.includes(value), value);
      assert.doesNotMatch(
        link,
        /text-muted|hover:text-default|rounded-md|outline-primary\/25|focus-visible:outline-3/,
      );
    }
    const disabledLink = await renderLink({ disabled: true });
    assert.match(disabledLink, /aria-disabled="true"/);
    assert.match(disabledLink, /cursor-not-allowed/);
    assert.doesNotMatch(disabledLink, /hover:text-/);
    const customLink = await renderLink({ class: 'text-ink hover:text-error' });
    assert.match(customLink, /text-ink hover:text-error/);
    assert.doesNotMatch(customLink, /text-primary/);
    const rawLink = await renderLink({ raw: true });
    assert.doesNotMatch(rawLink, /text-primary|focus-visible:outline/);
    const app = createSSRApp({ render: () => h(Button, {}, () => '测试') });
    app.use(router);
    const button = await renderToString(app);
    assert.match(button, /rounded-sm/);
    assert.match(button, /font-normal/);
    assert.doesNotMatch(button, /font-medium/);
    assert.match(button, /text-inverted/);
    assert.match(button, /hover:bg-primary\/75/);
    assert.match(button, /disabled:opacity-75/);
    assert.match(button, /px-2\.5 py-1\.5/);
    assert.doesNotMatch(button, /--nui-|min-h-10/);
    // 保留 Nuxt UI 默认字号与内边距，不残留自定义尺寸。
    for (const [size, fontSize] of Object.entries({
      xs: 'text-xs',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-sm',
      xl: 'text-base',
    })) {
      const sizedApp = createSSRApp({
        render: () => h(Button, { size }, () => size),
      });
      sizedApp.use(router);
      const inputFontSize = {
        xs: 'text-sm/4',
        sm: 'text-sm/4',
        md: 'text-base/5',
        lg: 'text-base/5',
        xl: 'text-base',
      }[size];
      for (const [html, expectedFontSize] of [
        [await renderToString(sizedApp), fontSize],
        [await renderToString(h(Input, { size })), inputFontSize],
      ]) {
        const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap(
          (match) => match[1].split(/\s+/),
        );
        assert.ok(
          classes.includes(expectedFontSize),
          `${size}: ${expectedFontSize}`,
        );
        const padding = {
          xs: ['px-2', 'py-1'],
          sm: ['px-2.5', 'py-1.5'],
          md: ['px-2.5', 'py-1.5'],
          lg: ['px-3', 'py-2'],
          xl: ['px-3', 'py-2'],
        }[size];
        for (const value of padding)
          assert.ok(classes.includes(value), `${size}: ${value}`);
        assert.ok(!classes.some((value) => value.startsWith('min-h-')));
        assert.deepEqual(
          classes.filter((value) =>
            [
              'text-xs',
              'text-sm',
              'text-base',
              'text-sm/4',
              'text-base/5',
              'text-[15px]',
            ].includes(value),
          ),
          [expectedFontSize],
        );
      }
    }
    for (const color of ['success', 'info', 'warning']) {
      for (const disabled of [false, true]) {
        const solidApp = createSSRApp({
          render: () =>
            h(Button, { color, variant: 'solid', disabled }, () => color),
        });
        solidApp.use(router);
        const solid = await renderToString(solidApp);
        assert.match(solid, new RegExp(`\\btext-on-${color}\\b`));
        assert.doesNotMatch(solid, /text-inverted/);
        assert.match(solid, new RegExp(`hover:bg-${color}/75`));
      }
      const outlineApp = createSSRApp({
        render: () => h(Button, { color, variant: 'outline' }, () => color),
      });
      outlineApp.use(router);
      const outline = await renderToString(outlineApp);
      assert.match(outline, new RegExp(`\\btext-${color}\\b`));
      assert.doesNotMatch(outline, /text-on-/);
    }
    for (const [variant, backgrounds] of [
      ['soft', ['bg-ink/8', 'hover:bg-ink/14', 'active:bg-ink/20']],
      ['subtle', ['bg-ink/8', 'hover:bg-ink/14', 'active:bg-ink/20']],
      ['ghost', ['bg-transparent', 'hover:bg-ink/10', 'active:bg-ink/16']],
    ]) {
      for (const disabled of [false, true]) {
        const neutralApp = createSSRApp({
          render: () =>
            h(Button, { color: 'neutral', variant, disabled }, () => variant),
        });
        neutralApp.use(router);
        const neutral = await renderToString(neutralApp);
        const classes =
          neutral.match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? [];
        for (const background of backgrounds)
          assert.ok(classes.includes(background), background);
        assert.ok(classes.includes(`disabled:${backgrounds[0]}`));
        assert.ok(classes.includes(`aria-disabled:${backgrounds[0]}`));
        assert.match(neutral, /focus-visible:outline-3/);
        assert.doesNotMatch(neutral, /bg-elevated|bg-accented/);
        if (variant === 'subtle') {
          assert.ok(classes.includes('ring'));
          assert.ok(classes.includes('ring-inset'));
          assert.ok(classes.includes('ring-accented'));
        }
        if (variant === 'ghost') {
          assert.ok(classes.includes('hover:disabled:bg-transparent'));
          assert.ok(classes.includes('hover:aria-disabled:bg-transparent'));
        }
      }
    }
    const input = await renderToString(h(Input, { modelValue: 'Novelia' }));
    assert.doesNotMatch(input, /min-h-10/);
    assert.match(input, /px-2\.5 py-1\.5/);
    assert.match(input, /border-border/);
    assert.match(input, /bg-transparent/);
    assert.match(input, /focus-visible:border-primary/);

    const { default: Slider } = await server.ssrLoadModule(
      '@nuxt/ui/components/Slider.vue',
    );
    for (const orientation of ['horizontal', 'vertical']) {
      const slider = await renderToString(
        h(Slider, { modelValue: 50, orientation, 'aria-label': '音量' }),
      );
      const track = slider.match(/<[^>]+data-slot="track"[^>]*>/)?.[0] ?? '';
      const thumb = slider.match(/<[^>]+data-slot="thumb"[^>]*>/)?.[0] ?? '';
      assert.match(track, /bg-border/);
      assert.match(track, orientation === 'horizontal' ? /\bh-1\b/ : /\bw-1\b/);
      assert.doesNotMatch(track, /h-\[8px\]|w-\[8px\]/);
      assert.match(thumb, /bg-surface/);
      assert.match(thumb, /shadow-sm/);
      assert.match(thumb, /ring-inset/);
      assert.match(thumb, /ring-primary/);
    }
  } finally {
    await server.close();
  }
});

test('真实 CSS 构建复用主题 token 和 data-theme，区分表面与文字色', async () => {
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

  assert.match(css, /--color-primary:\s*#18a058/);
  assert.match(css, /--ui-primary:\s*var\(--color-primary\)/);
  assert.match(css, /--ui-bg:\s*var\(--color-surface\)/);
  assert.match(css, /--ui-bg-muted:\s*var\(--color-embedded\)/);
  assert.match(css, /--ui-text:\s*var\(--color-ink\)/);
  assert.match(css, /--ui-border:\s*var\(--color-border\)/);
  for (const color of ['success', 'info', 'warning']) {
    assert.match(css, new RegExp(`--color-on-${color}:\\s*#(?:fff|ffffff);`));
    assert.match(
      css,
      new RegExp(
        `:root\\[data-theme=['"]dark['"]\\]\\s*\\{[^}]*--color-on-${color}:\\s*#0b0b0d`,
      ),
    );
    assert.match(
      css,
      new RegExp(
        `\\.text-on-${color}\\s*\\{\\s*color:\\s*var\\(--color-on-${color}\\)`,
      ),
    );
  }
  // 不再生成旧按钮的自定义配色和状态变量。
  assert.doesNotMatch(css, /--nui-(?:color|on|soft-opacity)/);
  assert.match(css, /\[data-theme[='"\s]+dark/);
  assert.match(css, /background-color:\s*var\(--ui-bg-muted\)/);
  assert.match(css, /background-color:\s*var\(--color-muted\)/);
  assert.match(css, /border-color:\s*var\(--color-muted\)/);
  // 默认品牌色不能变成 --color-primary ↔ --ui-primary 的循环引用。
  assert.doesNotMatch(css, /--color-primary:\s*var\(--ui-primary\)/);
});
