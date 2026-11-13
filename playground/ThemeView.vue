<script setup lang="ts">
import { XPage, useWebKit } from '@novelia/web-kit';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const { theme } = useWebKit();
const values = ref<Record<string, string>>({});
const readerPreview = ref(false);
const readerBackground = ref('#fff2e2');
const readerFont = ref('#000000');
watch([readerPreview, readerBackground], ([enabled, background]) => {
  if (!enabled) {
    theme.clearOverride();
    return;
  }
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(background.slice(offset, offset + 2), 16),
  );
  const brightness = (rgb[0]! * 299 + rgb[1]! * 587 + rgb[2]! * 114) / 1000;
  theme.setOverride({
    preference: brightness < 120 ? 'dark' : 'light',
    tokens: { '--ui-bg': background },
  });
});
onUnmounted(() => {
  if (readerPreview.value) theme.clearOverride();
});

// 使用完整的静态类名，让 Tailwind 能扫描到每个色块的工具类。
const colorGroups = [
  {
    title: 'Nuxt UI 背景与文字',
    colors: [
      { token: '--ui-bg', class: 'bg-default' },
      { token: '--ui-bg-muted', class: 'bg-muted' },
      { token: '--ui-bg-elevated', class: 'bg-elevated' },
      { token: '--ui-bg-accented', class: 'bg-accented' },
      { token: '--ui-text', class: 'bg-(--ui-text)' },
      { token: '--ui-text-muted', class: 'bg-(--ui-text-muted)' },
      { token: '--ui-text-inverted', class: 'bg-(--ui-text-inverted)' },
      { token: '--ui-border', class: 'bg-(--ui-border)' },
    ],
  },
  {
    title: 'Nuxt UI 语义色',
    colors: [
      { token: '--ui-primary', class: 'bg-primary' },
      { token: '--ui-success', class: 'bg-success' },
      { token: '--ui-info', class: 'bg-info' },
      { token: '--ui-warning', class: 'bg-warning' },
      { token: '--ui-error', class: 'bg-error' },
    ],
  },
  {
    title: '项目专属背景',
    colors: [
      { token: '--color-paper', class: 'bg-paper' },
      { token: '--color-surface', class: 'bg-surface' },
      { token: '--color-embedded', class: 'bg-embedded' },
      { token: '--color-popover', class: 'bg-popover' },
      { token: '--color-modal', class: 'bg-modal' },
      { token: '--color-hover', class: 'bg-hover' },
    ],
  },
];

const statuses = [
  {
    label: '成功',
    class: 'bg-success/10 text-success',
    token: 'success',
  },
  { label: '信息', class: 'bg-info/10 text-info', token: 'info' },
  {
    label: '警告',
    class: 'bg-warning/10 text-warning',
    token: 'warning',
  },
  { label: '错误', class: 'bg-error/10 text-error', token: 'error' },
];
const surfaces = [
  { label: 'paper', class: 'bg-paper' },
  { label: 'surface', class: 'bg-surface' },
  { label: 'default', class: 'bg-default' },
  { label: 'popover', class: 'bg-popover' },
  { label: 'modal', class: 'bg-modal' },
];
function readThemeValues() {
  const style = getComputedStyle(document.documentElement);
  values.value = Object.fromEntries(
    colorGroups.flatMap((group) =>
      group.colors.map(({ token }) => [
        token,
        style.getPropertyValue(token).trim(),
      ]),
    ),
  );
}

onMounted(readThemeValues);
watch([theme.theme, theme.override], readThemeValues, { flush: 'post' });
</script>

<template>
  <XPage>
    <UPageHeader
      title="主题测试"
      description="使用 Nuxt UI 原生语义变量、工具类与项目专属背景。"
    />
    <div class="flex flex-col gap-8">
      <p class="text-sm text-muted">
        切换主题后，色块和变量值会同步更新。“跟随系统”会响应操作系统的
        prefers-color-scheme 变化，切换按钮则按当前外观取反并固定下来。
      </p>

      <section aria-labelledby="reader-theme-preview">
        <h2 id="reader-theme-preview" class="heading-bar mb-2 font-medium">
          阅读器临时主题
        </h2>
        <p class="mb-4 text-sm text-muted">
          按背景亮度选择 UI
          明暗基底，正文色单独设置。站点偏好不变，关闭预览或离开本页后恢复。
        </p>
        <div class="mb-4 flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2">
            <input v-model="readerPreview" type="checkbox" />
            启用临时覆盖
          </label>
          <label class="flex items-center gap-2">
            背景
            <input v-model="readerBackground" type="color" />
          </label>
          <label class="flex items-center gap-2">
            正文
            <input v-model="readerFont" type="color" />
          </label>
          <span class="text-sm text-muted">
            站点偏好：{{ theme.preference.value }} · 生效外观：{{
              theme.theme.value
            }}
          </span>
        </div>
        <div
          class="rounded-md border border-default bg-default p-6"
          :style="{ color: readerPreview ? readerFont : undefined }"
        >
          这是阅读正文。修改背景时，页面背景和明暗基底同步更新；正文色不会影响菜单和按钮。
        </div>
      </section>

      <section aria-labelledby="theme-palette">
        <h2 id="theme-palette" class="heading-bar mb-2 font-medium">
          Nuxt UI 语义变量与项目背景
        </h2>
        <p class="mb-4 text-sm text-muted">
          通用颜色直接使用 Nuxt UI 的 --ui-* 变量。背景、文字、边框分别使用
          bg-default、text-default、border-default；控件通过 color / variant
          配置语义和状态。只有项目专属背景保留 --color-* 变量。
        </p>
        <div
          v-for="group in colorGroups"
          :key="group.title"
          class="mb-6 last:mb-0"
        >
          <h3 class="mb-3 text-sm font-medium">{{ group.title }}</h3>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div
              v-for="color in group.colors"
              :key="color.token"
              class="overflow-hidden rounded-sm border border-default bg-surface"
            >
              <div
                class="h-16 border-b border-default"
                :class="color.class"
                aria-hidden="true"
              />
              <div class="p-3">
                <code class="block break-all text-xs text-default">
                  {{ color.token }}
                </code>
                <code class="mt-1 block break-all text-xs text-muted">
                  {{ values[color.token] || '—' }}
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="theme-surfaces"
        class="border-t border-default pt-6"
      >
        <h2 id="theme-surfaces" class="heading-bar mb-4 font-medium">
          背景层级与文字
        </h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="surface in surfaces"
            :key="surface.label"
            class="rounded-sm border border-default p-4"
            :class="surface.class"
          >
            <h3 class="mb-3 font-medium text-default">
              bg-{{ surface.label }}
            </h3>
            <p class="text-sm text-default">
              正文 / text-default：中文 Aa 0123456789
            </p>
            <p class="mt-2 text-sm text-muted">
              次要文字 / text-muted：辅助说明
            </p>
            <p class="mt-2 text-xs text-muted">
              小号文字：用于检查低对比度背景的可读性
            </p>
            <div class="my-3 border-t border-default" />
            <a
              href="#/theme"
              class="text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary/75 focus-visible:outline-2 focus-visible:outline-primary"
            >
              主题链接 / text-primary
            </a>
            <div
              class="mt-3 rounded-floating bg-embedded px-4 py-3 text-sm text-default"
            >
              嵌入内容 / bg-embedded
              <p class="mt-1 text-xs text-muted">
                静态辅助信息；深色时叠加在当前父背景上，不作为悬停状态。
              </p>
            </div>
            <div class="mt-3 rounded-sm bg-hover p-2 text-xs text-default">
              悬停底色 / bg-hover
            </div>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="theme-status"
        class="border-t border-default pt-6"
      >
        <h2 id="theme-status" class="heading-bar mb-4 font-medium">
          语义状态与浅色背景
        </h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="status in statuses"
            :key="status.token"
            class="rounded-sm p-4"
            :class="status.class"
          >
            <h3 class="mb-1 text-sm font-medium">
              {{ status.label }} · {{ status.token }}
            </h3>
            <p class="text-sm">
              这是一条状态说明，检查文字与 soft 背景的搭配。
            </p>
            <p class="mt-2 break-all font-mono text-xs">{{ status.class }}</p>
          </article>
        </div>
        <div
          class="mt-4 rounded-sm border border-error/30 bg-error/10 p-4 text-sm text-error"
        >
          错误提示：border-error/30 边框 + bg-error/10 浅底 + text-error 文字。
        </div>
      </section>

      <section
        aria-labelledby="theme-accent"
        class="border-t border-default pt-6"
      >
        <h2 id="theme-accent" class="heading-bar mb-4 font-medium">
          主色与危险色对比
        </h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <div
            class="rounded-sm bg-primary px-4 py-3 text-sm text-inverted hover:bg-primary/75"
          >
            bg-primary + text-inverted · hover:bg-primary/75
          </div>
          <div class="rounded-sm bg-primary/10 px-4 py-3 text-sm text-primary">
            bg-primary/10 + text-primary
          </div>
          <div class="rounded-sm bg-error px-4 py-3 text-sm text-inverted">
            bg-error + text-inverted
          </div>
          <div class="rounded-sm bg-error/75 px-4 py-3 text-sm text-inverted">
            bg-error/75 + text-inverted
          </div>
        </div>
      </section>
    </div>
  </XPage>
</template>
