<script setup lang="ts">
import {
  XMarkdownContent,
  XMarkdownEditor,
  createMarkdown,
  useMarkdownDraft,
} from '@novelia/web-kit';
import { ref } from 'vue';
import ExampleControls from '../../components/ExampleControls.vue';

const markdown = createMarkdown().disable(['image']);
const source = ref(
  '## 旅途中的书店\n\n这是一个 **Markdown** 示例，支持 *斜体*、~~删除线~~ 与 `代码`。\n\n!!藏在书页里的秘密!!\n\n::: details 阅读更多\n雨后的街角，一家书店亮着灯。\n:::\n\n::: star 4.5',
);
const disabled = ref(false);
const options = ref(['preview', 'autosize']);
const draftTarget = ref('one');
const {
  text: draftSource,
  restored: draftRestored,
  clear: clearDraft,
} = useMarkdownDraft({
  key: () => `playground:comment:${draftTarget.value}`,
  initialValue: '@示例用户 ',
  maxAge: 3 * 24 * 60 * 60 * 1000,
});
</script>

<template>
  <section
    id="markdown-editor"
    aria-labelledby="markdown-title"
    class="scroll-mt-20 py-8"
  >
    <h2 id="markdown-title" class="heading-bar mb-4 text-lg font-medium">
      Markdown · XMarkdownEditor / XMarkdownContent
    </h2>
    <p class="mb-4 text-sm text-muted">
      支持实时渲染、扩展语法和按场景保存的本地草稿。此示例禁用图片语法。
    </p>
    <ExampleControls
      v-model:disabled="disabled"
      v-model:options="options"
      :controls="['disabled']"
      :extra-options="[
        { label: '只读', value: 'readonly' },
        { label: '预览', value: 'preview' },
        { label: '自动高度', value: 'autosize' },
        { label: '工具栏吸顶', value: 'sticky' },
      ]"
      class="mb-6"
    />
    <div class="grid min-w-0 gap-6 lg:grid-cols-2">
      <div class="min-w-0 space-y-3">
        <h3 class="text-sm font-medium">编辑与预览</h3>
        <XMarkdownEditor
          v-model="source"
          :markdown="markdown"
          :rows="6"
          :maxlength="2000"
          :tools="[
            'bold',
            'italic',
            'strike',
            'code',
            'link',
            'spoiler',
            'star',
            'details',
          ]"
          :disabled="disabled"
          :readonly="options.includes('readonly')"
          :preview="options.includes('preview')"
          :autosize="options.includes('autosize')"
          :sticky="options.includes('sticky')"
          :sticky-offset="50"
          aria-label="Markdown 正文"
        />
        <p class="text-xs text-muted">{{ source.length }} / 2000</p>
      </div>
      <div class="min-w-0 space-y-3">
        <h3 class="text-sm font-medium">内容渲染</h3>
        <XMarkdownContent :source="source" :markdown="markdown" />
      </div>
      <div class="min-w-0 space-y-3">
        <h3 class="text-sm font-medium">禁用</h3>
        <XMarkdownEditor
          model-value="禁用状态的编辑器。"
          disabled
          :rows="3"
          aria-label="禁用编辑器"
        />
      </div>
      <div class="min-w-0 space-y-3">
        <h3 class="text-sm font-medium">只读</h3>
        <XMarkdownEditor
          model-value="只读内容仍可选择和复制。"
          readonly
          :rows="3"
          aria-label="只读编辑器"
        />
      </div>
      <div class="min-w-0 space-y-3">
        <h3 class="text-sm font-medium">固定高度</h3>
        <XMarkdownEditor
          :autosize="false"
          :rows="3"
          :tools="['bold', 'link']"
          aria-label="固定高度编辑器"
          placeholder="写下你的想法…"
        />
      </div>
      <div class="min-w-0 space-y-3">
        <h3 class="text-sm font-medium">校验错误</h3>
        <XMarkdownEditor
          invalid
          :preview="false"
          :rows="3"
          :tools="[]"
          aria-label="错误编辑器"
          aria-describedby="markdown-error"
        />
        <p id="markdown-error" class="text-xs text-error">正文不能为空</p>
      </div>
    </div>
    <div class="mt-6 space-y-3">
      <h3 class="text-sm font-medium">本地草稿</h3>
      <p class="text-xs text-muted">
        切换场景或刷新页面后恢复内容，草稿保留 3 天。
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <URadioGroup
          v-model="draftTarget"
          :items="[
            { label: '场景一', value: 'one' },
            { label: '场景二', value: 'two' },
          ]"
          variant="table"
          size="xs"
          indicator="hidden"
          orientation="horizontal"
          highlight
          aria-label="草稿场景"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          @click="clearDraft()"
        >
          丢弃草稿
        </UButton>
      </div>
      <p v-if="draftRestored" role="status" class="text-xs text-muted">
        已恢复本地草稿
      </p>
      <XMarkdownEditor v-model="draftSource" :rows="3" aria-label="本地草稿" />
    </div>
  </section>
</template>
