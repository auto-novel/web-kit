<script setup lang="ts">
import { useTemplateRef } from 'vue';

import XButton from '../button/XButton.vue';
import { mergeClasses } from '../classes';
import type { XFilePickerProps } from './types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XFilePickerProps>(), {
  multiple: false,
  disabled: false,
});
const emit = defineEmits<{ select: [files: File[]] }>();
defineSlots<{
  /** 自定义触发器需自行绑定 open 与 disabled，以保留原生按钮的键盘行为。 */
  trigger(props: { open: () => void; disabled: boolean }): unknown;
}>();
const input = useTemplateRef<HTMLInputElement>('input');

function open() {
  if (props.disabled || !input.value) return;
  input.value.value = '';
  input.value.click();
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  // 不持有文件，也允许下一次选择相同文件。
  target.value = '';
  if (!props.disabled && files.length) emit('select', files);
}

defineExpose({ open });
</script>

<template>
  <span
    v-bind="{ ...$attrs, class: undefined }"
    :class="mergeClasses('inline-flex', $attrs.class)"
  >
    <input
      ref="input"
      type="file"
      hidden
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="onChange"
    />
    <slot name="trigger" :open="open" :disabled="disabled">
      <XButton :disabled="disabled" @click="open">选择文件</XButton>
    </slot>
  </span>
</template>
