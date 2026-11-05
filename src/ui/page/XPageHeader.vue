<script setup lang="ts">
import { mergeClasses } from '../classes';

import type { XPageHeaderProps } from './types';

defineOptions({ inheritAttrs: false });

defineProps<XPageHeaderProps>();
</script>

<template>
  <header
    v-bind="{ ...$attrs, class: undefined }"
    :class="
      mergeClasses(
        'my-6 flex min-w-0 flex-wrap items-center gap-3',
        $attrs.class,
      )
    "
  >
    <div class="min-w-0 flex-1 basis-64">
      <h1
        class="m-0 text-3xl leading-relaxed font-medium wrap-break-word text-ink"
      >
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 mb-0 wrap-break-word text-muted">
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex min-w-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
