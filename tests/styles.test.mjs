import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compile } from 'tailwindcss';

test('heading-bar 按需生成纯装饰样式，并允许工具类覆盖', async () => {
  const utilities = await readFile(
    new URL('../src/styles/utilities.css', import.meta.url),
    'utf8',
  );
  const compiler = await compile(`
    @theme { --spacing: 0.25rem; --color-warning: #f0a020; }
    ${utilities}
    @tailwind utilities;
  `);
  assert.doesNotMatch(compiler.build([]), /\.heading-bar/);

  const css = compiler.build([
    'heading-bar',
    'ps-4',
    'before:w-1',
    'before:bg-warning',
  ]);
  const heading = css.slice(
    css.indexOf('.heading-bar {'),
    css.indexOf('\n.ps-4'),
  );
  assert.match(heading, /position: relative/);
  assert.match(heading, /padding-inline-start: 12px/);
  assert.match(heading, /&::before/);
  assert.match(heading, /inset-block: 0/);
  assert.match(heading, /inset-inline-start: 0/);
  assert.match(heading, /width: 3px/);
  assert.match(heading, /border-radius: 9999px/);
  assert.match(heading, /background-color: var\(--ui-primary\)/);
  assert.match(heading, /content: (?:''|"")/);
  assert.doesNotMatch(heading, /font-|line-height|margin|h[23]/);

  // Same-specificity overrides must follow the composite utility.
  for (const selector of [
    '.ps-4 {',
    '.before\\:w-1::before {',
    '.before\\:bg-warning::before {',
  ]) {
    assert.ok(css.indexOf(selector) > css.indexOf('.heading-bar {'), selector);
  }
});
