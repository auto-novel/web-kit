<script setup lang="ts">
import { computed, ref } from 'vue';

import { mergeClasses } from '../classes';

import type { XButtonProps } from './types';
import { buttonVariants } from './variants';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XButtonProps>(), {
  as: 'button',
  type: 'button',
  color: 'primary',
  variant: 'solid',
  size: 'md',
});

const isPending = ref(false);
const isLoading = computed(
  () => props.loading || (props.loadingAuto && isPending.value),
);
const isDisabled = computed(() => props.disabled || isLoading.value);
const showContent = computed(
  () => !isLoading.value || !props.size.startsWith('icon'),
);

async function handleClick(event: MouseEvent) {
  // 自定义组件可能直接 emit click，仍需在处理入口兜底。
  if (isDisabled.value) {
    preventDisabledClick(event);
    return;
  }

  isPending.value = !!props.loadingAuto;
  try {
    const handlers = Array.isArray(props.onClick)
      ? props.onClick
      : [props.onClick];
    await Promise.all(handlers.map((handler) => handler?.(event)));
  } finally {
    isPending.value = false;
  }
}

// 链接和自定义组件不受原生 disabled 约束，在捕获阶段阻止激活。
function preventDisabledClick(event: MouseEvent) {
  if (!isDisabled.value) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}
</script>

<template>
  <component
    :is="as"
    v-bind="{ ...$attrs, class: undefined }"
    :type="as === 'button' ? type : undefined"
    :disabled="isDisabled || undefined"
    :aria-disabled="isDisabled ? true : $attrs['aria-disabled']"
    :aria-busy="isLoading ? true : $attrs['aria-busy']"
    @click.capture="preventDisabledClick"
    @click="handleClick"
    :class="
      mergeClasses(buttonVariants({ color, variant, size }), $attrs.class)
    "
  >
    <span
      v-if="isLoading"
      class="size-[1em] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      aria-hidden="true"
    />
    <slot v-if="showContent" />
  </component>
</template>
