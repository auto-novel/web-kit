<script setup lang="ts">
import { parseDate } from '@internationalized/date';
import {
  CalendarMonthOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  CloseOutlined,
} from '@vicons/material';
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  RangeCalendarRoot,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarPrev,
  RangeCalendarNext,
  RangeCalendarGrid,
  RangeCalendarGridHead,
  RangeCalendarGridBody,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  type DateRange,
} from 'reka-ui';
import {
  computed,
  nextTick,
  ref,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue';

import { mergeClasses } from '../classes';
import { fieldVariants, fieldClearClass } from '../field';
import { useOverlayLayer } from '../overlayLayer';
import type { XDateRangePickerProps } from './types';

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<Omit<XDateRangePickerProps, 'modelValue'>>(),
  {
    placeholder: '选择日期区间',
    size: 'md',
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
const trigger = useTemplateRef<{ $el?: HTMLElement }>('trigger');
const { contentStyle } = useOverlayLayer(open);
const minValue = computed(() => (props.min ? parseDate(props.min) : undefined));
const maxValue = computed(() => (props.max ? parseDate(props.max) : undefined));
// Reka 的日历默认使用英文名称；没有独立标签时沿用触发器的 aria-label。
const calendarLabel = computed(() => {
  const label = attrs['aria-label'];
  return typeof label === 'string' && label.trim() ? label : '日期区间';
});
const navigationClass =
  'inline-flex size-8 items-center justify-center rounded-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40';

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
function updateRange(value: DateRange) {
  if (props.disabled || props.readonly) return;
  draft.value = value;
  if (!value.start || !value.end) return;
  model.value = [value.start.toString(), value.end.toString()];
  open.value = false;
}
function clear() {
  if (props.disabled || props.readonly) return;
  model.value = null;
  resetDraft();
  open.value = false;
  // 清空按钮随模型消失，把焦点交还触发器。
  void nextTick(() => trigger.value?.$el?.focus());
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <div
      :style="$attrs.style"
      :class="
        mergeClasses(
          fieldVariants({ size, invalid, disabled }),
          ui.root,
          $attrs.class,
        )
      "
    >
      <PopoverTrigger
        ref="trigger"
        v-bind="{ ...$attrs, class: undefined, style: undefined }"
        type="button"
        :disabled="disabled"
        :aria-invalid="invalid || $attrs['aria-invalid'] || undefined"
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
      </PopoverTrigger>
      <button
        v-if="clearable && model && !disabled && !readonly"
        type="button"
        aria-label="清空日期区间"
        :class="mergeClasses(fieldClearClass, ui.clear)"
        @click="clear"
      >
        <CloseOutlined class="size-4" aria-hidden="true" />
      </button>
    </div>
    <PopoverPortal>
      <PopoverContent
        :side-offset="6"
        align="start"
        :style="contentStyle"
        :class="
          mergeClasses(
            'floating-panel floating-panel-motion max-w-[calc(100vw-1rem)] p-3 text-sm text-ink',
            ui.content,
          )
        "
      >
        <RangeCalendarRoot
          v-slot="{ grid, weekDays }"
          :model-value="draft"
          :locale="locale"
          :calendar-label="calendarLabel"
          :min-value="minValue"
          :max-value="maxValue"
          :disabled="disabled"
          :readonly="readonly"
          fixed-weeks
          @update:model-value="updateRange"
        >
          <RangeCalendarHeader
            :class="
              mergeClasses(
                'mb-2 flex items-center justify-between gap-2',
                ui.header,
              )
            "
          >
            <RangeCalendarPrev
              :class="mergeClasses(navigationClass, ui.navigation)"
              aria-label="上个月"
            >
              <ChevronLeftOutlined class="size-5" aria-hidden="true" />
            </RangeCalendarPrev>
            <RangeCalendarHeading class="font-medium" />
            <RangeCalendarNext
              :class="mergeClasses(navigationClass, ui.navigation)"
              aria-label="下个月"
            >
              <ChevronRightOutlined class="size-5" aria-hidden="true" />
            </RangeCalendarNext>
          </RangeCalendarHeader>
          <RangeCalendarGrid
            v-for="month in grid"
            :key="month.value.toString()"
            class="w-full border-collapse select-none"
          >
            <RangeCalendarGridHead>
              <RangeCalendarGridRow>
                <RangeCalendarHeadCell
                  v-for="day in weekDays"
                  :key="day"
                  class="size-9 text-center font-normal text-muted"
                >
                  {{ day }}
                </RangeCalendarHeadCell>
              </RangeCalendarGridRow>
            </RangeCalendarGridHead>
            <RangeCalendarGridBody>
              <RangeCalendarGridRow
                v-for="(week, index) in month.rows"
                :key="index"
              >
                <RangeCalendarCell
                  v-for="date in week"
                  :key="date.toString()"
                  :date="date"
                  class="p-0 text-center"
                >
                  <RangeCalendarCellTrigger
                    :day="date"
                    :month="month.value"
                    :class="
                      mergeClasses(
                        'inline-flex size-9 items-center justify-center rounded-sm outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary data-[outside-view]:text-muted data-[highlighted]:bg-primary-soft data-[selected]:bg-primary-soft data-[selection-start]:bg-primary data-[selection-start]:text-on-primary data-[selection-end]:bg-primary data-[selection-end]:text-on-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[unavailable]:line-through',
                        ui.day,
                      )
                    "
                  />
                </RangeCalendarCell>
              </RangeCalendarGridRow>
            </RangeCalendarGridBody>
          </RangeCalendarGrid>
        </RangeCalendarRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
