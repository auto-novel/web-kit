<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';

import { mergeClasses } from '../classes';

import type { XSwitchProps } from './types';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<Omit<XSwitchProps, 'modelValue'>>(), {
  size: 'md',
  ui: () => ({}),
});

const model = defineModel<boolean>({ default: false });

// 对齐 Nuxt UI：轨道高度为滑块高度加上下各 2px 边框。
const rootSizes = {
  xs: 'h-4 w-7',
  sm: 'h-4.5 w-8',
  md: 'h-5 w-9',
  lg: 'h-5.5 w-10',
  xl: 'h-6 w-11',
};
const thumbSizes = {
  xs: 'size-3 data-[state=checked]:translate-x-3 rtl:data-[state=checked]:-translate-x-3',
  sm: 'size-3.5 data-[state=checked]:translate-x-3.5 rtl:data-[state=checked]:-translate-x-3.5',
  md: 'size-4 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4',
  lg: 'size-4.5 data-[state=checked]:translate-x-4.5 rtl:data-[state=checked]:-translate-x-4.5',
  xl: 'size-5 data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5',
};
</script>

<template>
  <SwitchRoot
    v-bind="{ ...$attrs, class: undefined }"
    v-model="model"
    :disabled="disabled"
    :required="required"
    :name="name"
    :value="value"
    :class="
      mergeClasses(
        'inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border align-middle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary motion-reduce:transition-none',
        rootSizes[size],
        ui.root,
        $attrs.class,
      )
    "
  >
    <SwitchThumb
      :class="
        mergeClasses(
          'pointer-events-none block translate-x-0 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none',
          thumbSizes[size],
          ui.thumb,
        )
      "
    />
  </SwitchRoot>
</template>
