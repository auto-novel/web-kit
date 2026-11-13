<script setup lang="ts">
import { mergeClasses } from '../classes';

import type { XPageProps } from './types';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<XPageProps>(), {
  ui: () => ({}),
});
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    :class="
      mergeClasses(
        'mx-auto w-full min-w-0 max-w-5xl px-3 sm:px-8',
        $attrs.class,
      )
    "
  >
    <div class="flex gap-5">
      <div class="min-w-0 flex-1 py-6">
        <slot />
      </div>
      <aside
        v-if="$slots.aside"
        :class="
          mergeClasses(
            'sticky top-(--web-kit-header-height) self-start',
            'flex flex-col',
            'h-[calc(100dvh-var(--web-kit-header-height))] w-80 shrink-0',
            'border-s border-default ps-5',
            ui.aside,
          )
        "
      >
        <slot name="aside" />
      </aside>
    </div>
  </div>
</template>
