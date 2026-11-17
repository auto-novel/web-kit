<script setup lang="ts">
import { computed } from 'vue';

import { mergeClasses } from '../classes';
import type {
  XProgressCircleColor,
  XProgressCircleProps,
  XProgressCircleSize,
} from './types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XProgressCircleProps>(), {
  color: 'primary',
  size: 'md',
  running: false,
  ui: () => ({}),
});

const sizes = {
  sm: { root: 'size-14', label: 'text-[11px] font-semibold' },
  md: { root: 'size-22', label: 'text-[18px] font-semibold' },
  lg: { root: 'size-30', label: 'text-[28px] font-normal' },
} satisfies Record<XProgressCircleSize, { root: string; label: string }>;
const size = computed(() => sizes[props.size]);

const colors: Record<XProgressCircleColor, string> = {
  primary: 'stroke-primary',
  secondary: 'stroke-secondary',
  success: 'stroke-success',
  info: 'stroke-info',
  warning: 'stroke-warning',
  error: 'stroke-error',
  neutral: 'stroke-inverted',
};
const clampPercentage = (value: number) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
const percentage = computed(() => clampPercentage(props.percentage));
const displayPercentage = computed(
  () => Math.round(percentage.value * 10) / 10,
);
const segments = computed(() => {
  let offset = 0;
  return (
    props.segments ?? [{ percentage: percentage.value, color: props.color }]
  )
    .map((segment, index) => {
      const value = Math.min(100 - offset, clampPercentage(segment.percentage));
      const result = {
        index,
        percentage: value,
        offset,
        color: colors[segment.color ?? props.color],
      };
      offset += value;
      return result;
    })
    .filter((segment) => segment.percentage > 0);
});
</script>

<template>
  <div
    :class="
      mergeClasses(
        'relative shrink-0 text-default tabular-nums',
        size.root,
        ui.root,
        $attrs.class,
      )
    "
    role="progressbar"
    aria-label="进度"
    :aria-valuenow="percentage"
    :aria-valuemin="0"
    :aria-valuemax="100"
    v-bind="{ ...$attrs, class: undefined }"
  >
    <svg
      :class="mergeClasses('block size-full', ui.svg)"
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        :class="mergeClasses('fill-none stroke-default stroke-4', ui.track)"
        cx="28"
        cy="28"
        r="23"
      />
      <circle
        v-for="segment of segments"
        :key="segment.index"
        :class="
          mergeClasses(
            'origin-center -rotate-90 fill-none stroke-4',
            'transition-[stroke-dasharray,stroke-dashoffset] duration-250 ease-[ease] motion-reduce:transition-none',
            segment.color,
            running ? 'progress-circle-shimmer' : undefined,
            ui.segment,
            running ? ui.shimmer : undefined,
          )
        "
        cx="28"
        cy="28"
        r="23"
        pathLength="100"
        :stroke-dasharray="`${segment.percentage} ${100 - segment.percentage}`"
        :stroke-dashoffset="-segment.offset"
      />
    </svg>
    <div
      :class="
        mergeClasses(
          'absolute inset-0 flex items-center justify-center',
          size.label,
          ui.label,
        )
      "
      aria-hidden="true"
    >
      <slot :percentage="percentage">{{ displayPercentage }}%</slot>
    </div>
  </div>
</template>

<style scoped>
.progress-circle-shimmer {
  animation: progress-circle-pulse 1.6s ease-in-out infinite;
}
@keyframes progress-circle-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@media (prefers-reduced-motion: reduce) {
  .progress-circle-shimmer {
    animation: none;
  }
}
</style>
