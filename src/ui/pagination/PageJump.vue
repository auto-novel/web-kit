<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import UButton from '@nuxt/ui/components/Button.vue';
import UInputNumber from '@nuxt/ui/components/InputNumber.vue';
import UPopover from '@nuxt/ui/components/Popover.vue';
import { mergeClasses, type XUi } from '../classes';

const props = withDefaults(
  defineProps<{
    page: number;
    totalPages: number;
    ui?: XUi<'content' | 'label' | 'input' | 'button'>;
  }>(),
  { ui: () => ({}) },
);

const emit = defineEmits<{
  change: [page: number];
}>();

// Nuxt 的 content 类型仅列出 Popover props；原生 aria 属性仍会透传至面板。
const popoverContent = {
  sideOffset: 6,
  collisionPadding: 8,
  'aria-label': '跳转到指定页',
};
// 保留小数供整数校验，避免格式化将非法小数四舍五入成合法页码。
const numberFormat = { useGrouping: false, maximumFractionDigits: 20 };
const open = ref(false);
const jumpPage = ref<number>();
// InputNumber 在失焦/Enter 时提交模型；输入中的草稿用于即时校验和跳转。
const targetPage = ref<number>();
watch(jumpPage, (value) => (targetPage.value = value), { flush: 'sync' });
function resetPage() {
  jumpPage.value = props.page;
  targetPage.value = props.page;
}
function updateDraft(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim();
  targetPage.value = value ? Number(value) : undefined;
}
const canJump = computed(
  () =>
    targetPage.value !== undefined &&
    Number.isInteger(targetPage.value) &&
    targetPage.value >= 1 &&
    targetPage.value <= props.totalPages &&
    targetPage.value !== props.page,
);

watch(open, (isOpen) => {
  if (isOpen) resetPage();
});

watch([() => props.page, () => props.totalPages], () => {
  open.value = false;
  resetPage();
});

function jumpToPage() {
  if (!canJump.value || targetPage.value === undefined) return;
  emit('change', targetPage.value);
  open.value = false;
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="popoverContent"
    :ui="{
      content: mergeClasses(
        'flex items-center gap-2 p-3 outline-none',
        ui.content,
      ),
    }"
  >
    <slot />
    <template #content>
      <label
        :class="
          mergeClasses('flex items-center gap-2 text-xs text-muted', ui.label)
        "
      >
        跳至
        <UInputNumber
          v-model.optional="jumpPage"
          size="sm"
          :min="1"
          :max="totalPages"
          :step="1"
          :increment="false"
          :decrement="false"
          :format-options="numberFormat"
          allow-invalid
          disable-wheel-change
          aria-label="跳转页码"
          class="w-16"
          :ui="{ base: mergeClasses(ui.input) }"
          @input="updateDraft"
          @keydown.enter.capture.prevent="jumpToPage"
        />
        页
      </label>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        :class="mergeClasses(ui.button)"
        :disabled="!canJump"
        @click="jumpToPage"
      >
        跳转
      </UButton>
    </template>
  </UPopover>
</template>
