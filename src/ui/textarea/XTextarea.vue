<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  useAttrs,
  useTemplateRef,
  watch,
  type TextareaHTMLAttributes,
} from 'vue';

import { mergeClasses } from '../classes';
import { fieldInputClass, fieldVariants } from '../field';
import type { XTextareaProps } from './types';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<Omit<XTextareaProps, 'modelValue'>>(), {
  size: 'md',
  ui: () => ({}),
});
const model = defineModel<string>({ default: '' });
const attrs = useAttrs();
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea');
const maxLength = computed(() => {
  const value = attrs.maxlength;
  if (value == null || value === '') return undefined;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
});

function clearHeight() {
  const element = textarea.value;
  if (!element) return;
  element.style.height = '';
  element.style.overflowY = '';
}

function resize() {
  const element = textarea.value;
  if (!element || !props.autosize) return;
  const view = element.ownerDocument.defaultView;
  if (!view) return;
  const style = view.getComputedStyle(element);
  const px = (value: string) => Number.parseFloat(value) || 0;
  const lineHeight = px(style.lineHeight) || px(style.fontSize) * 1.2 || 24;
  const padding = px(style.paddingTop) + px(style.paddingBottom);
  const border = px(style.borderTopWidth) + px(style.borderBottomWidth);
  const options = typeof props.autosize === 'object' ? props.autosize : {};
  const rows = (value: number | undefined, fallback: number) =>
    value != null && Number.isFinite(value)
      ? Math.max(1, Math.floor(value))
      : fallback;
  const minRows = rows(options.minRows, 1);
  const maxRows = Math.max(minRows, rows(options.maxRows, Infinity));
  // scrollHeight 包含 padding，不含 border；先清空高度以支持内容减少。
  element.style.height = '0px';
  element.style.overflowY = 'hidden';
  const contentHeight = Math.max(0, element.scrollHeight - padding);
  const height = Math.min(
    Math.max(contentHeight, minRows * lineHeight),
    maxRows * lineHeight,
  );
  element.style.height = `${height + (style.boxSizing === 'border-box' ? padding + border : 0)}px`;
  element.style.overflowY = contentHeight > height ? 'auto' : 'hidden';
}

function onViewportResize() {
  if (props.autosize) resize();
}

function onInput() {
  // 组合输入尚未更新模型时也同步高度。
  void nextTick(resize);
}

let observer: ResizeObserver | undefined;
let stopResize: (() => void) | undefined;
onMounted(() => {
  if (props.autosize) resize();
  const element = textarea.value;
  const view = element?.ownerDocument.defaultView;
  if (!element || !view) return;
  if (view.ResizeObserver) {
    let width: number | undefined;
    observer = new view.ResizeObserver(([entry]) => {
      if (!props.autosize || !entry || entry.contentRect.width === width)
        return;
      width = entry.contentRect.width;
      resize();
    });
    observer.observe(element);
  } else {
    view.addEventListener('resize', onViewportResize);
    stopResize = () => view.removeEventListener('resize', onViewportResize);
  }
});
watch(
  [model, () => props.size],
  () => {
    if (props.autosize) resize();
  },
  { flush: 'post' },
);
watch(
  () => props.autosize,
  (value) => {
    if (value) resize();
    else clearHeight();
  },
  { flush: 'post', deep: true },
);
onBeforeUnmount(() => {
  observer?.disconnect();
  stopResize?.();
});

defineExpose({
  textarea,
  focus: (options?: FocusOptions) => textarea.value?.focus(options),
  blur: () => textarea.value?.blur(),
  select: () => textarea.value?.select(),
});
</script>

<template>
  <div
    :style="$attrs.style"
    :class="
      mergeClasses(
        fieldVariants({ size, invalid, disabled }),
        'flex-col items-stretch gap-0',
        ui.root,
        $attrs.class,
      )
    "
  >
    <textarea
      ref="textarea"
      v-model="model"
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      :rows="($attrs.rows as TextareaHTMLAttributes['rows']) ?? 3"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="
        invalid
          ? true
          : ($attrs['aria-invalid'] as TextareaHTMLAttributes['aria-invalid'])
      "
      :class="
        mergeClasses(
          fieldInputClass,
          'flex-none resize-y leading-6',
          autosize && 'resize-none',
          ui.textarea,
        )
      "
      @input="onInput"
    />
    <span
      v-if="showCount"
      :class="mergeClasses('pb-1.5 text-right text-xs text-muted', ui.count)"
    >
      {{
        maxLength === undefined
          ? model.length
          : `${model.length} / ${maxLength}`
      }}
    </span>
  </div>
</template>
