<script setup lang="ts">
import { XNumberInput } from '@novelia/web-kit';
import { ref } from 'vue';
import ComponentPage from './ComponentPage.vue';

const value = ref<number | null>(null);
const code = `<XNumberInput
  v-model="value"
  :min="0"
  :max="100"
  :step="0.5"
  placeholder="0 至 100"
  aria-label="数量"
/>`;
</script>

<template>
  <ComponentPage
    title="数字输入 · XNumberInput"
    description="数字或 null 模型，支持上下限、步长和原生数字输入交互。"
    :code="code"
  >
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">基本用法</h2>
      <div class="max-w-md space-y-3">
        <label for="number-quantity" class="block text-sm">数量</label>
        <XNumberInput
          id="number-quantity"
          v-model="value"
          :min="0"
          :max="100"
          :step="0.5"
          placeholder="0 至 100"
        />
        <p class="text-xs text-muted" aria-live="polite">
          当前值：{{ value ?? '（空值 null）' }}
        </p>
        <p class="text-sm text-muted">
          失焦或按 Enter 提交，清空为 null；使用方向键按 0.5 调整。
        </p>
      </div>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">禁用与只读</h2>
      <div class="grid max-w-2xl gap-3 sm:grid-cols-2">
        <XNumberInput :model-value="10" disabled aria-label="禁用数字输入" />
        <XNumberInput :model-value="20" readonly aria-label="只读数字输入" />
      </div>
    </section>
  </ComponentPage>
</template>
