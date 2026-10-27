<script setup lang="ts">
import { mergeClasses } from '../classes';
import type { XErrorProps } from './types';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<XErrorProps>(), {
  title: '加载失败',
  ui: () => ({}),
});

defineSlots<{
  default?(): unknown;
}>();
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    :class="
      mergeClasses(
        'grid min-h-80 place-items-center p-8 text-center',
        ui.root,
        $attrs.class,
      )
    "
  >
    <div>
      <div
        :class="
          mergeClasses(
            'mx-auto grid size-12 place-items-center rounded-full bg-error-soft text-error-text',
            ui.icon,
          )
        "
        aria-hidden="true"
      >
        !
      </div>
      <h2
        v-if="title"
        :class="mergeClasses('mt-4 text-lg font-semibold text-ink', ui.title)"
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        :class="mergeClasses('mt-2 text-sm text-muted', ui.description)"
      >
        {{ description }}
      </p>
      <div v-if="$slots.default" class="mt-5"><slot /></div>
    </div>
  </div>
</template>
