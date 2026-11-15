<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    controls: readonly ('size' | 'color' | 'variant' | 'disabled')[];
    variantOptions?: readonly string[];
    extraOptions?: readonly { label: string; value: string }[];
  }>(),
  {
    extraOptions: () => [],
    variantOptions: () => [
      'solid',
      'outline',
      'soft',
      'subtle',
      'ghost',
      'link',
    ],
  },
);

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const colors = [
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'error',
  'neutral',
] as const;
const size = defineModel<(typeof sizes)[number]>('size', { default: 'md' });
const variant = defineModel<string>('variant', { default: 'solid' });
const disabled = defineModel<boolean>('disabled', { default: false });
const options = defineModel<string[]>('options', { default: () => [] });
const checkboxItems = computed(() => [
  ...(props.controls.includes('disabled')
    ? [{ label: '禁用', value: 'disabled' }]
    : []),
  ...props.extraOptions.map((option) => ({
    ...option,
    value: `extra:${option.value}`,
  })),
]);
const checkedOptions = computed({
  get: () => [
    ...(props.controls.includes('disabled') && disabled.value
      ? ['disabled']
      : []),
    ...options.value.map((value) => `extra:${value}`),
  ],
  set: (values: string[]) => {
    if (props.controls.includes('disabled')) {
      disabled.value = values.includes('disabled');
    }
    options.value = values
      .filter((value) => value.startsWith('extra:'))
      .map((value) => value.slice(6));
  },
});
const color = defineModel<(typeof colors)[number]>('color', {
  default: 'primary',
});
const colorOptions = colors.map((value) => ({ label: value, value }));
const id = useId();
const radioUi = {
  fieldset: 'flex-wrap',
  item: 'flex-none cursor-pointer',
  label: 'font-normal',
};
const colorDots = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-inverted',
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="controls.includes('color')"
      class="flex min-w-0 items-center gap-3"
    >
      <span :id="`${id}-color`" class="shrink-0 text-sm text-muted">颜色</span>
      <URadioGroup
        v-model="color"
        :items="colorOptions"
        :ui="radioUi"
        variant="table"
        size="xs"
        indicator="hidden"
        orientation="horizontal"
        highlight
        :aria-labelledby="`${id}-color`"
      >
        <template #label="{ item }">
          <span class="flex items-center gap-2">
            <span
              aria-hidden="true"
              class="size-2.5 shrink-0 rounded-full"
              :class="colorDots[item.value]"
            />
            {{ item.label }}
          </span>
        </template>
      </URadioGroup>
    </div>
    <div
      v-if="
        controls.some((control) => control !== 'color') ||
        extraOptions.length ||
        $slots.default
      "
      class="flex flex-wrap items-center gap-4"
    >
      <div
        v-if="controls.includes('size')"
        class="flex min-w-0 items-center gap-3"
      >
        <span :id="`${id}-size`" class="shrink-0 text-sm text-muted">尺寸</span>
        <URadioGroup
          v-model="size"
          :items="[...sizes]"
          :ui="radioUi"
          variant="table"
          size="xs"
          indicator="hidden"
          orientation="horizontal"
          highlight
          :aria-labelledby="`${id}-size`"
        />
      </div>
      <div
        v-if="controls.includes('variant')"
        class="flex min-w-0 items-center gap-3"
      >
        <span :id="`${id}-variant`" class="shrink-0 text-sm text-muted">
          变体
        </span>
        <URadioGroup
          v-model="variant"
          :items="[...variantOptions]"
          :ui="radioUi"
          variant="table"
          size="xs"
          indicator="hidden"
          orientation="horizontal"
          highlight
          :aria-labelledby="`${id}-variant`"
        />
      </div>
      <UCheckboxGroup
        v-if="checkboxItems.length"
        v-model="checkedOptions"
        :items="checkboxItems"
        :ui="radioUi"
        variant="table"
        size="xs"
        indicator="hidden"
        orientation="horizontal"
        highlight
        aria-label="示例状态"
      />
      <slot />
    </div>
  </div>
</template>
