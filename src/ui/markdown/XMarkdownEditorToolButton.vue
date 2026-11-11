<script setup lang="ts">
import UButton from '@nuxt/ui/components/Button.vue';
import UTooltip from '@nuxt/ui/components/Tooltip.vue';
import { mergeClasses } from '../classes';
import type { XMarkdownEditorToolButtonProps } from './types';

defineOptions({ inheritAttrs: false });
defineProps<XMarkdownEditorToolButtonProps>();
</script>

<template>
  <UTooltip :text="label">
    <UButton
      v-bind="{ ...$attrs, class: undefined }"
      type="button"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      :disabled="disabled"
      :icon="icon"
      :aria-label="label"
      :class="
        mergeClasses('size-8 min-h-0 justify-center text-ink', $attrs.class)
      "
      @mousedown.prevent
    >
      <template v-if="$slots.default" #default>
        <slot />
      </template>
    </UButton>
  </UTooltip>
</template>
