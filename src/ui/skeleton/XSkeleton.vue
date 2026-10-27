<script setup lang="ts">
import { mergeClasses } from '../classes';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    :class="
      mergeClasses(
        'animate-pulse rounded-sm bg-divider motion-reduce:animate-none',
        $attrs.class,
      )
    "
    aria-hidden="true"
  />
</template>
