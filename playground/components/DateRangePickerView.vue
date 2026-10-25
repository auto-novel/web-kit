<script setup lang="ts">
import { XDateRangePicker, type XDateRange } from '@novelia/web-kit';
import { ref } from 'vue';
import ComponentPage from './ComponentPage.vue';

const range = ref<XDateRange | null>(null);
const example: XDateRange = ['2026-06-01', '2026-06-07'];
const code = `<XDateRangePicker
  v-model="range"
  min="2026-01-01"
  max="2026-12-31"
  clearable
  aria-label="日期区间"
/>`;
</script>

<template>
  <ComponentPage
    description="选择完整日期区间，绑定无时区 ISO 日期；支持范围约束和清空。"
    :code="code"
  >
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">基本用法</h2>
      <div class="max-w-md space-y-3">
        <XDateRangePicker
          v-model="range"
          min="2026-01-01"
          max="2026-12-31"
          clearable
          aria-label="日期区间"
        />
        <p class="text-xs text-muted" aria-live="polite">
          当前区间：{{ range ? range.join(' 至 ') : '（未选择）' }}
        </p>
        <p class="text-sm text-muted">
          仅完整选择后更新模型，清空为 null；可选范围为 2026 年。
        </p>
      </div>
    </section>
    <section class="border-t border-divider pt-6">
      <h2 class="mb-3 font-medium">禁用与只读</h2>
      <div class="grid max-w-2xl gap-3 sm:grid-cols-2">
        <XDateRangePicker
          :model-value="example"
          disabled
          aria-label="禁用日期区间"
        />
        <XDateRangePicker
          :model-value="example"
          readonly
          aria-label="只读日期区间"
        />
      </div>
    </section>
  </ComponentPage>
</template>
