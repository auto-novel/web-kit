<script setup lang="ts">
import { parseDate } from '@internationalized/date';
import { CalendarMonthOutlined, CloseOutlined } from '@vicons/material';
import UButton from '@nuxt/ui/components/Button.vue';
import UCalendar, {
  type CalendarProps,
} from '@nuxt/ui/components/Calendar.vue';
import UPopover from '@nuxt/ui/components/Popover.vue';
import {
  computed,
  nextTick,
  ref,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
  type AriaAttributes,
} from 'vue';

import { mergeClasses } from '../classes';
import type { XDateRangePickerProps } from './types';

type DateRange = NonNullable<CalendarProps<true>['modelValue']>;

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<Omit<XDateRangePickerProps, 'modelValue'>>(),
  {
    placeholder: '选择日期区间',
    locale: 'zh-CN',
    ui: () => ({}),
  },
);
const model = defineModel<XDateRangePickerProps['modelValue']>({
  default: null,
});
const attrs = useAttrs();
const open = ref(false);
const draft = shallowRef<DateRange>({ start: undefined, end: undefined });
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const minValue = computed(() => (props.min ? parseDate(props.min) : undefined));
const maxValue = computed(() => (props.max ? parseDate(props.max) : undefined));
const ariaInvalid = computed(
  () =>
    (props.invalid ||
      attrs['aria-invalid'] ||
      undefined) as AriaAttributes['aria-invalid'],
);
const prevMonth = computed(() => ({
  'aria-label': '上个月',
  class: mergeClasses(props.ui.navigation),
}));
const nextMonth = computed(() => ({
  'aria-label': '下个月',
  class: mergeClasses(props.ui.navigation),
}));
const calendarLabel = computed(() => {
  const label = attrs['aria-label'];
  return typeof label === 'string' && label.trim() ? label : '日期区间';
});

// 中间选择只留在日历内，不触发消费者的筛选请求。
function resetDraft() {
  draft.value = model.value
    ? { start: parseDate(model.value[0]), end: parseDate(model.value[1]) }
    : { start: undefined, end: undefined };
}
watch(() => model.value, resetDraft, { immediate: true, deep: true });
watch(open, resetDraft);
watch(
  () => props.disabled,
  (blocked) => {
    if (blocked) open.value = false;
  },
);
function updateRange(value: CalendarProps<true>['modelValue']) {
  if (props.disabled || props.readonly) return;
  draft.value = value ?? { start: undefined, end: undefined };
  if (!value?.start || !value.end) return;
  model.value = [value.start.toString(), value.end.toString()];
  open.value = false;
}
function clear() {
  if (props.disabled || props.readonly) return;
  model.value = null;
  resetDraft();
  open.value = false;
  // 清空按钮随模型消失，把焦点交还触发器。
  void nextTick(() => trigger.value?.focus());
}
</script>

<template>
  <div
    :style="$attrs.style"
    :class="
      mergeClasses(
        'flex min-h-10 w-full min-w-0 items-center gap-2 rounded-sm border bg-transparent px-3 text-sm text-default transition-colors',
        invalid
          ? 'border-error focus-within:ring-2 focus-within:ring-error/15'
          : 'border-default',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : !invalid &&
              'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
        ui.root,
        $attrs.class,
      )
    "
  >
    <UPopover
      v-model:open="open"
      :content="{ sideOffset: 6, align: 'start' }"
      :ui="{
        content: mergeClasses(
          'max-w-[calc(100vw-1rem)] p-3 text-sm',
          ui.content,
        ),
      }"
    >
      <button
        ref="trigger"
        v-bind="{ ...$attrs, class: undefined, style: undefined }"
        type="button"
        :disabled="disabled"
        :aria-invalid="ariaInvalid"
        :class="
          mergeClasses(
            'flex min-w-0 flex-1 items-center gap-2 self-stretch text-left outline-none',
            ui.trigger,
          )
        "
      >
        <span :class="['min-w-0 flex-1 truncate', !model && 'text-muted']">
          {{ model ? `${model[0]} 至 ${model[1]}` : placeholder }}
        </span>
        <CalendarMonthOutlined
          class="size-4 shrink-0 text-muted"
          aria-hidden="true"
        />
      </button>
      <template #content>
        <UCalendar
          range
          variant="soft"
          :model-value="draft"
          :locale="locale"
          :calendar-label="calendarLabel"
          :min-value="minValue"
          :max-value="maxValue"
          :disabled="disabled"
          :readonly="readonly"
          :year-controls="false"
          :view-control="false"
          :prev-month="prevMonth"
          :next-month="nextMonth"
          :ui="{
            header: mergeClasses(ui.header),
            cellTrigger: mergeClasses(ui.day),
          }"
          fixed-weeks
          @update:model-value="updateRange"
        />
      </template>
    </UPopover>
    <UButton
      v-if="clearable && model && !disabled && !readonly"
      type="button"
      color="neutral"
      variant="link"
      size="xs"
      square
      aria-label="清空日期区间"
      :class="mergeClasses('size-5 shrink-0 justify-center p-0', ui.clear)"
      @click="clear"
    >
      <CloseOutlined class="size-4" aria-hidden="true" />
    </UButton>
  </div>
</template>
