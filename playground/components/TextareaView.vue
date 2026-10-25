<script setup lang="ts">
import { XButton, XTextarea } from '@novelia/web-kit';
import { ref, useTemplateRef } from 'vue';
import ComponentPage from './ComponentPage.vue';

const value = ref('Novelia 让长文本输入与表单风格保持一致。');
const textarea = useTemplateRef('textarea');
const code = `<XTextarea
  v-model="value"
  :autosize="{ minRows: 2, maxRows: 6 }"
  :maxlength="200"
  show-count
  placeholder="写点什么…"
  aria-label="内容"
/>`;
</script>

<template>
  <ComponentPage
    description="字符串绑定、自适应高度、字数统计与原生属性透传。"
    :code="code"
  >
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">自适应高度与字数统计</h2>
      <div class="max-w-md space-y-3">
        <label for="textarea-bio" class="block text-sm">个人简介</label>
        <XTextarea
          id="textarea-bio"
          ref="textarea"
          v-model="value"
          :autosize="{ minRows: 2, maxRows: 6 }"
          :maxlength="200"
          show-count
          placeholder="写点什么…"
        />
        <p class="text-xs text-muted" aria-live="polite">
          当前长度：{{ value.length }} · 高度随内容增长，超过 6 行后滚动。
        </p>
        <XButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="textarea?.focus()"
        >
          聚焦输入框
        </XButton>
      </div>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">尺寸与状态</h2>
      <div class="grid max-w-2xl gap-3 sm:grid-cols-2">
        <XTextarea
          size="sm"
          :rows="2"
          placeholder="小尺寸 sm"
          aria-label="小尺寸"
        />
        <XTextarea
          size="lg"
          :rows="2"
          placeholder="大尺寸 lg"
          aria-label="大尺寸"
        />
        <div>
          <XTextarea
            :rows="2"
            invalid
            model-value="不正确的内容"
            aria-label="错误示例"
            aria-describedby="textarea-error"
          />
          <p id="textarea-error" class="mt-1 text-xs text-error">
            请检查输入内容
          </p>
        </div>
        <XTextarea
          :rows="2"
          model-value="禁用内容"
          disabled
          aria-label="禁用示例"
        />
        <XTextarea
          :rows="2"
          model-value="只读内容"
          readonly
          aria-label="只读示例"
        />
      </div>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">接口约定</h2>
      <p class="text-sm leading-6 text-muted">
        v-model 始终为字符串；class 和 style
        作用于外层，其余原生属性及事件透传给 textarea。autosize 接受布尔值或 {
        minRows, maxRows }，达到 maxRows 后出现滚动；showCount 根据有效的
        maxlength 显示“当前 / 上限”。ui 可覆盖
        root、textarea、count。通过组件引用可访问 textarea 元素并调用 focus、
        blur、select。请使用 label 或 aria-label 提供名称。
      </p>
    </section>
  </ComponentPage>
</template>
