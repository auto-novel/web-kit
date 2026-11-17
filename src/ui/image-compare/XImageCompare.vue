<script setup lang="ts">
import { computed, type StyleValue } from 'vue';
import { mergeClasses } from '../classes';
import type { XImageCompareProps } from './types';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<XImageCompareProps>(), {
  beforeLabel: '对比前',
  afterLabel: '对比后',
  label: '拖动对比图片',
  disabled: false,
  ui: () => ({}),
});
const model = defineModel<number>({ default: 50 });
const position = computed(() =>
  Number.isFinite(model.value) ? Math.min(100, Math.max(0, model.value)) : 50,
);
const aspect = computed(() =>
  props.aspect && Number.isFinite(props.aspect) && props.aspect > 0
    ? props.aspect
    : undefined,
);
function onInput(event: Event) {
  if (!props.disabled)
    model.value = (event.target as HTMLInputElement).valueAsNumber;
}
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined, style: undefined }"
    :class="
      mergeClasses(
        'relative inline-block max-w-full align-middle leading-none select-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
        aspect ? 'w-full' : undefined,
        ui.root,
        $attrs.class,
      )
    "
    :style="[{ aspectRatio: aspect }, $attrs.style as StyleValue]"
  >
    <img
      :class="
        mergeClasses(
          'pointer-events-none block object-cover',
          aspect
            ? 'absolute inset-0 h-full w-full'
            : 'h-auto w-auto max-w-full',
          ui.before,
        )
      "
      :src="before"
      :alt="alt ? `${alt}（${beforeLabel}）` : beforeLabel"
      draggable="false"
    />
    <div
      :class="mergeClasses('pointer-events-none absolute inset-0', ui.after)"
      :style="{ clipPath: `inset(0 0 0 ${position}%)` }"
    >
      <img
        :class="mergeClasses('block h-full w-full object-cover', ui.afterImage)"
        :src="after"
        :alt="alt ? `${alt}（${afterLabel}）` : afterLabel"
        draggable="false"
      />
    </div>
    <span
      v-if="beforeLabel || $slots['before-label']"
      :class="
        mergeClasses(
          'pointer-events-none absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2 py-0.75 text-[11px] leading-[1.4] text-white',
          ui.beforeLabel,
        )
      "
      aria-hidden="true"
    >
      <slot name="before-label" :position="position">{{ beforeLabel }}</slot>
    </span>
    <span
      v-if="afterLabel || $slots['after-label']"
      :class="
        mergeClasses(
          'pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.75 text-[11px] leading-[1.4] text-white',
          ui.afterLabel,
        )
      "
      aria-hidden="true"
    >
      <slot name="after-label" :position="position">{{ afterLabel }}</slot>
    </span>
    <span
      :class="
        mergeClasses(
          'pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(0_0_0/15%)]',
          ui.divider,
        )
      "
      :style="{ left: `${position}%` }"
      aria-hidden="true"
    >
      <span
        :class="
          mergeClasses(
            'absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded-full bg-white text-xl leading-none text-gray-900 shadow-[0_2px_8px_rgb(0_0_0/25%)]',
            ui.handle,
          )
        "
      >
        <slot name="handle" :position="position">↔</slot>
      </span>
    </span>
    <!-- 零宽滑块使原生 range 取值区间与图片左右边缘对齐，保留键盘和触摸操作。 -->
    <input
      :value="position"
      :class="
        mergeClasses(
          'absolute inset-0 m-0 h-full w-full cursor-ew-resize touch-none appearance-none border-0 p-0 opacity-0 disabled:cursor-default [direction:ltr] [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:appearance-none',
          ui.input,
        )
      "
      type="range"
      min="0"
      max="100"
      step="0.1"
      :disabled="disabled"
      :aria-label="label"
      :aria-valuetext="`分界线位于 ${position}%`"
      @input="onInput"
    />
  </div>
</template>
