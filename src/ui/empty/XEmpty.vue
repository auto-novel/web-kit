<script setup lang="ts">
import { Inventory2Outlined } from '@vicons/material';

import { mergeClasses } from '../classes';
import type { XEmptyProps } from './types';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<XEmptyProps>(), {
  title: '暂无内容',
  size: 'default',
  ui: () => ({}),
});

defineSlots<{
  icon?(): unknown;
  default?(): unknown;
}>();
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    :class="
      mergeClasses(
        'grid place-items-center text-center',
        size === 'compact' ? 'min-h-52 p-6' : 'p-8',
        size === 'default' && 'min-h-80',
        size === 'large' && 'min-h-96',
        ui.root,
        $attrs.class,
      )
    "
  >
    <div>
      <div
        :class="
          mergeClasses(
            'mx-auto grid size-12 place-items-center rounded-full bg-paper text-muted',
            ui.icon,
          )
        "
        aria-hidden="true"
      >
        <slot name="icon"><Inventory2Outlined class="size-6" /></slot>
      </div>
      <h2
        v-if="title"
        :class="
          mergeClasses(
            'text-ink',
            size === 'compact'
              ? 'mt-3 text-sm font-medium'
              : 'mt-4 text-lg font-semibold',
            ui.title,
          )
        "
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        :class="
          mergeClasses(
            'text-muted',
            size === 'compact' ? 'mt-1 text-xs' : 'mt-2 text-sm',
            ui.description,
          )
        "
      >
        {{ description }}
      </p>
      <div v-if="$slots.default" class="mt-5"><slot /></div>
    </div>
  </div>
</template>
