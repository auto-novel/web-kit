import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JSDOM, VirtualConsole } from 'jsdom';
import { build } from 'vite';
import { htmlBootstrapPlugin } from '../src/vite.js';

function tags(options, config = { command: 'build', isProduction: true }) {
  const plugin = htmlBootstrapPlugin(options);
  plugin.configResolved(config);
  return plugin.transformIndexHtml.handler();
}

async function browser() {
  const scripts = (await tags())
    .map(({ children }) => `<script>${children}</script>`)
    .join('');
  return new JSDOM(
    `${scripts}<div id="app"><pre id="fallback-error"></pre></div>`,
    {
      runScripts: 'dangerously',
      virtualConsole: new VirtualConsole(),
    },
  );
}

test('统计默认关闭，配置 ID 后仅在生产构建启用', async () => {
  const analytics = 'G-TEST123';
  assert.equal((await tags()).length, 2);
  assert.equal((await tags({ analytics: false })).length, 2);
  assert.equal((await tags({ analytics })).length, 3);
  assert.equal(
    (await tags({ analytics }, { command: 'serve', isProduction: false }))
      .length,
    2,
  );
  assert.equal(
    (await tags({ analytics }, { command: 'build', isProduction: false }))
      .length,
    2,
  );
  assert.throws(
    () => tags({ analytics: '</script><script>alert(1)' }),
    /measurement ID/,
  );
});

test('生产构建始终压缩脚本，开发环境保留原文', async () => {
  const production = await tags();
  const readable = await tags(undefined, {
    command: 'serve',
    isProduction: false,
  });
  for (const [index, tag] of production.entries()) {
    assert.ok(tag.children.length < readable[index].children.length);
    assert.equal(tag.injectTo, readable[index].injectTo);
  }
  assert.deepEqual(
    await tags(undefined, {
      command: 'build',
      isProduction: true,
      build: { minify: false },
    }),
    production,
  );
  assert.deepEqual(
    await tags(undefined, { command: 'build', isProduction: false }),
    readable,
  );
});

test('主题预启动使用原生类名，存储优先并支持系统回退', async () => {
  for (const command of ['serve', 'build']) {
    const injected = await tags(undefined, { command, isProduction: true });
    for (const [stored, systemDark, expected] of [
      ['"dark"', false, 'dark'],
      ['"light"', true, 'light'],
      ['"system"', true, 'dark'],
      ['invalid json', false, 'light'],
    ]) {
      const dom = new JSDOM(
        '<!doctype html><html class="host light dark"></html>',
        {
          url: 'https://example.com',
          runScripts: 'outside-only',
        },
      );
      try {
        const { window } = dom;
        window.localStorage.setItem('web-kit:theme:v1', stored);
        window.matchMedia = () => ({ matches: systemDark });
        window.eval(injected[1].children);
        const root = window.document.documentElement;
        assert.ok(root.classList.contains(expected));
        assert.equal(
          root.classList.contains(expected === 'dark' ? 'light' : 'dark'),
          false,
        );
        assert.ok(root.classList.contains('host'));
        assert.equal(root.hasAttribute('data-theme'), false);
      } finally {
        dom.window.close();
      }
    }
  }
});

test('统计脚本异步加载，初始化 dataLayer 和站点 ID', async () => {
  const injected = await tags({ analytics: 'G-TEST123' });
  const dom = await browser();
  try {
    dom.window.eval(injected[2].children);
    const script = dom.window.document.querySelector('script[src]');
    assert.equal(script.async, true);
    assert.equal(
      script.src,
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
    );
    assert.equal(dom.window.dataLayer[0][0], 'js');
    assert.equal(dom.window.dataLayer[1][0], 'config');
    assert.equal(dom.window.dataLayer[1][1], 'G-TEST123');
  } finally {
    dom.window.close();
  }
});

test('启动错误以纯文本显示', async () => {
  const dom = await browser();
  try {
    const fallback = dom.window.document.getElementById('fallback-error');
    dom.window.dispatchEvent(
      new dom.window.ErrorEvent('error', {
        message: '<img src=x onerror=alert(1)>',
      }),
    );
    assert.equal(fallback.querySelector('img'), null);
    assert.match(fallback.textContent, /<img/);
  } finally {
    dom.window.close();
  }
});

test('补充模块加载和 Promise 错误，挂载后不再写入页面', async () => {
  const dom = await browser();
  try {
    const { window } = dom;
    const fallback = window.document.getElementById('fallback-error');
    const module = window.document.createElement('script');
    module.type = 'module';
    module.src = '/assets/main.js';
    window.document.body.appendChild(module);
    module.dispatchEvent(new window.Event('error'));
    assert.match(fallback.textContent, /Failed to load module:.*main.js/);
    const rejection = new window.Event('unhandledrejection', {
      cancelable: true,
    });
    rejection.reason = new Error('startup rejected');
    window.dispatchEvent(rejection);
    assert.match(fallback.textContent, /startup rejected/);
    const observer = new window.ErrorEvent('error', {
      message: 'ResizeObserver loop limit exceeded',
      cancelable: true,
    });
    window.dispatchEvent(observer);
    assert.equal(observer.defaultPrevented, false);
    assert.doesNotMatch(fallback.textContent, /ResizeObserver/);
    window.document.getElementById('app').textContent = 'Mounted';
    window.dispatchEvent(rejection);
    assert.equal(window.document.getElementById('app').textContent, 'Mounted');
  } finally {
    dom.window.close();
  }
});

test('实际 Vite 构建优先注入兜底和主题，并启用统计', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'web-kit-html-'));
  try {
    await writeFile(
      path.join(root, 'index.html'),
      '<head></head><body><div id="app"><pre id="fallback-error"></pre></div><script type="module" src="/main.js"></script></body>',
    );
    await writeFile(path.join(root, 'main.js'), 'console.log("app entry");');
    const result = await build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [htmlBootstrapPlugin({ analytics: 'G-TEST123' })],
      build: { write: false, minify: false },
    });
    const html = result.output.find(
      (item) => item.fileName === 'index.html',
    ).source;
    assert.match(html, /window\.addEventListener\([`'"]error/);
    assert.ok(
      html.indexOf('window.addEventListener(') <
        html.indexOf('web-kit:theme:v1'),
    );
    assert.ok(html.indexOf('web-kit:theme:v1') < html.indexOf('type="module"'));
    assert.match(html, /googletagmanager/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
