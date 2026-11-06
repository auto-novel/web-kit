<script setup lang="ts">
import { mergeClasses } from '../classes';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    :class="
      mergeClasses(
        '@container/x-page mx-auto w-full min-w-0 max-w-5xl px-3 pt-6 pb-6 sm:px-8',
        $attrs.class,
      )
    "
  >
    <div class="flex gap-5">
      <div class="min-w-0 flex-1">
        <slot />
      </div>
      <aside
        v-if="$slots.aside"
        :class="[
          'sticky top-(--web-kit-header-height) self-start',
          'hidden flex-col @4xl/x-page:flex',
          'h-[calc(100dvh-var(--web-kit-header-height))] w-80 shrink-0',
          'border-s border-divider ps-5',
        ]"
      >
        <slot name="aside" />
      </aside>
    </div>
  </div>
</template>
