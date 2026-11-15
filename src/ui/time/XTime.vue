<script setup lang="ts">
import UTooltip from '@nuxt/ui/components/Tooltip.vue';
import { formatISO } from 'date-fns';
import { computed } from 'vue';

import { mergeClasses } from '../classes';
import {
  formatRelativeTime,
  formatTimeValue,
  TIME_PRESETS,
  timeValueToDate,
  type XTimeProps,
} from './time';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XTimeProps>(), {
  preset: 'datetime',
});

const date = computed(() => timeValueToDate(props.time));
const text = computed(() => {
  const value = date.value;
  if (!value) return '';

  if (props.format) return formatTimeValue(value, props.format);

  return props.preset === 'relative'
    ? formatRelativeTime(value, props.to)
    : formatTimeValue(value, TIME_PRESETS[props.preset]);
});
const machineTime = computed(() => (date.value ? formatISO(date.value) : ''));
const title = computed(
  () =>
    props.title ??
    (date.value ? formatTimeValue(date.value, 'yyyy年M月d日 HH:mm:ss') : ''),
);
</script>

<template>
  <UTooltip v-if="date" :text="title">
    <time
      :datetime="machineTime"
      v-bind="{ ...$attrs, class: undefined }"
      :class="mergeClasses($attrs.class)"
    >
      {{ text }}
    </time>
  </UTooltip>
</template>
