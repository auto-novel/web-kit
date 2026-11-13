<script setup lang="ts">
import { HelpOutlineOutlined } from '@vicons/material';
import { ref } from 'vue';

import UButton from '@nuxt/ui/components/Button.vue';
import UModal from '@nuxt/ui/components/Modal.vue';

withDefaults(defineProps<{ mode?: 'article' | 'comment' }>(), {
  mode: 'comment',
});

const open = ref(false);

type MarkdownFeature = {
  name: string;
  syntax: string;
  articleOnly?: boolean;
};

const features: MarkdownFeature[] = [
  { name: '粗体', syntax: '**粗体文字**' },
  { name: '斜体', syntax: '*斜体文字*' },
  { name: '删除线', syntax: '~~删除的文字~~' },
  { name: '行内代码', syntax: '`代码`' },
  { name: '链接', syntax: '[链接文字](https://example.com)' },
  { name: '自动链接', syntax: 'https://example.com' },
  { name: '无序列表', syntax: '- 列表项' },
  { name: '有序列表', syntax: '1. 列表项' },
  { name: '换行', syntax: '直接换行' },
  { name: '剧透', syntax: '!!剧透内容!!' },
  { name: '星级评分', syntax: '::: star 4.5' },
  {
    name: '折叠内容',
    syntax: '::: details 点击展开\n折叠内容\n:::',
  },
  { name: '标题', syntax: '## 二级标题', articleOnly: true },
  { name: '引用', syntax: '> 引用内容', articleOnly: true },
  { name: '代码块', syntax: '```\n代码\n```', articleOnly: true },
  { name: '分割线', syntax: '---', articleOnly: true },
  { name: '图片', syntax: '![图片说明](图片地址)', articleOnly: true },
  {
    name: '表格',
    syntax: '| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |',
    articleOnly: true,
  },
  {
    name: '引用式链接',
    syntax: '[链接文字][标识]\n\n[标识]: https://example.com',
    articleOnly: true,
  },
];
</script>

<template>
  <UModal
    v-model:open="open"
    title="Markdown 语法帮助"
    :ui="{
      content:
        'w-2xl max-w-[calc(100vw-2rem)] max-h-[min(80dvh,calc(100dvh-2rem))]',
      header:
        'border-b border-default px-5 py-4 pr-14 sm:px-6 sm:py-4 sm:pr-14',
      title: 'font-semibold',
      description: 'mt-1',
      body: 'p-4 sm:p-6',
    }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      size="xs"
      class="hover:bg-muted hover:text-default"
    >
      <HelpOutlineOutlined class="size-4" aria-hidden="true" />
      Markdown 语法帮助
    </UButton>
    <template #body>
      <div>
        <div
          class="divide-y divide-default sm:divide-y-0 sm:overflow-hidden sm:rounded-md sm:border sm:border-default"
        >
          <div
            class="hidden grid-cols-[10.5rem_minmax(0,1fr)] bg-paper text-xs font-semibold text-muted sm:grid"
          >
            <span class="px-3 py-2.5">功能</span>
            <span class="px-3 py-2.5">基本语法</span>
          </div>
          <section
            v-for="feature in features"
            :key="feature.name"
            class="grid gap-2 py-3 text-sm sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-center sm:gap-0 sm:border-t sm:border-default sm:py-0"
            :class="{
              'bg-paper/50': mode === 'comment' && feature.articleOnly,
            }"
          >
            <div class="sm:px-3 sm:py-2.5">
              <h3 class="font-medium text-default">
                {{ feature.name }}
              </h3>
              <span
                v-if="feature.articleOnly"
                class="mt-1 block text-xs text-warning"
              >
                评论不支持
              </span>
            </div>
            <code
              class="block whitespace-pre-wrap rounded-sm bg-paper px-2 py-1.5 font-mono text-xs leading-5 text-default sm:mx-3 sm:my-2"
            >
              {{ feature.syntax }}
            </code>
          </section>
        </div>

        <p class="mt-4 text-xs leading-5 text-muted">
          为保证内容安全，文章和评论都不支持直接嵌入 HTML。
        </p>
      </div>
    </template>
  </UModal>
</template>
