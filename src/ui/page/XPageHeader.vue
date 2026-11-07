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
        'mb-6 flex min-w-0 flex-wrap items-start gap-x-4 gap-y-3',
        $attrs.class,
      )
    "
  >
    <div class="min-w-0 flex-1 basis-64">
      <h1
        class="m-0 text-2xl leading-tight font-medium wrap-anywhere text-balance text-ink sm:text-3xl"
      >
        <slot name="title">{{ title }}</slot>
      </h1>
      <p
        v-if="description"
        class="mt-2 mb-0 text-sm wrap-anywhere text-pretty text-muted"
      >
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
